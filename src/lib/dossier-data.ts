/**
 * Données des espaces d'un dossier : messagerie, agenda, documents, album et indicateurs des tuiles.
 * Ces fonctions ne vérifient PAS l'accès : l'appelant passe d'abord par `canAccessDossier` / `guard`.
 */
import mongoose from "mongoose";
import sharp from "sharp";
import { Readable } from "node:stream";
import { connectDb } from "@/lib/db";
import { listPosts } from "@/lib/family-space";
import { Appointment } from "@/models/Appointment";
import { Membership } from "@/models/Membership";
import { Message } from "@/models/Message";
import { Post } from "@/models/Post";
import { ReadState } from "@/models/ReadState";
import { User } from "@/models/User";

export const PARIS_TZ = "Europe/Paris";

/* ---------- Heure de Paris ---------- */

function parisOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** « 2026-11-12 » + « 14:00 » (heure de Paris) → instant UTC, passage heure d'été / d'hiver compris. */
export function parisToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let utc = wall - parisOffsetMinutes(new Date(wall)) * 60000;
  const check = parisOffsetMinutes(new Date(utc));
  if (wall - check * 60000 !== utc) utc = wall - check * 60000;
  return new Date(utc);
}

export const fmt = {
  day: new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: PARIS_TZ }),
  dayYear: new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: PARIS_TZ }),
  short: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: PARIS_TZ }),
  time: new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: PARIS_TZ }),
  stamp: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: PARIS_TZ }),
};

/** Majuscule à la première lettre seulement (« jeudi 5 novembre » → « Jeudi 5 novembre »). */
export function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** « 14 h » ou « 14 h 30 », plus lisible que « 14:30 » pour tout le monde. */
export function frTime(d: Date): string {
  const [h, m] = fmt.time.format(d).split(":");
  return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
}

export function frDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function todayInParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PARIS_TZ }).format(new Date());
}

export function excerpt(text: string, max = 110): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/* ---------- Messagerie ---------- */

export type MessageView = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "family" | "admin";
  text: string;
  createdAt: Date;
};

export async function listMessages(dossierId: string, limit = 200): Promise<MessageView[]> {
  await connectDb();
  const rows = await Message.find({ dossierId }).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.reverse().map((m) => ({
    id: String(m._id),
    authorId: String(m.authorId),
    authorName: m.authorName,
    authorRole: m.authorRole,
    text: m.text,
    createdAt: m.createdAt,
  }));
}

/** Messages écrits par les autres depuis la dernière lecture de cette personne. */
export async function unreadMessages(userId: string, dossierId: string): Promise<number> {
  await connectDb();
  const state = await ReadState.findOne({ dossierId, userId }).lean();
  return Message.countDocuments({
    dossierId,
    authorId: { $ne: new mongoose.Types.ObjectId(userId) },
    ...(state?.messagesReadAt ? { createdAt: { $gt: state.messagesReadAt } } : {}),
  });
}

export async function markMessagesRead(userId: string, dossierId: string): Promise<void> {
  await connectDb();
  await ReadState.updateOne(
    { dossierId, userId },
    { $set: { messagesReadAt: new Date() } },
    { upsert: true },
  );
}

/* ---------- Agenda ---------- */

export type AppointmentView = { id: string; startsAt: Date; durationMinutes: number; note: string };

function toAppointment(a: { _id: unknown; startsAt: Date; durationMinutes: number; note?: string }): AppointmentView {
  return { id: String(a._id), startsAt: a.startsAt, durationMinutes: a.durationMinutes, note: a.note ?? "" };
}

/** Une visite reste « à venir » jusqu'à sa fin. */
export async function listAppointments(dossierId: string): Promise<{ upcoming: AppointmentView[]; past: AppointmentView[] }> {
  await connectDb();
  const rows = await Appointment.find({ dossierId }).sort({ startsAt: 1 }).lean();
  const now = Date.now();
  const all = rows.map(toAppointment);
  const isOver = (a: AppointmentView) => a.startsAt.getTime() + a.durationMinutes * 60000 < now;
  return { upcoming: all.filter((a) => !isOver(a)), past: all.filter(isOver).reverse().slice(0, 12) };
}

export async function nextAppointment(dossierId: string): Promise<AppointmentView | null> {
  await connectDb();
  const row = await Appointment.findOne({ dossierId, startsAt: { $gt: new Date(Date.now() - 12 * 3600000) } })
    .sort({ startsAt: 1 })
    .lean();
  if (!row) return null;
  const a = toAppointment(row);
  return a.startsAt.getTime() + a.durationMinutes * 60000 < Date.now() ? null : a;
}

/** « Jeudi 12 novembre à 14 h » (ou « jeudi… » en milieu de phrase). */
export function appointmentLabel(a: AppointmentView, capitalize = true): string {
  const day = fmt.day.format(a.startsAt);
  return `${capitalize ? day.charAt(0).toUpperCase() + day.slice(1) : day} à ${frTime(a.startsAt)}`;
}

/* ---------- Documents (PDF et images, stockés dans MongoDB) ---------- */

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const DOCUMENT_BUCKET = "documents";

export const DOCUMENT_CATEGORIES = {
  contrat: "Contrat",
  devis: "Devis",
  facture: "Factures",
  attestation: "Attestation fiscale",
  autre: "Autres documents",
} as const;
export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;

function documentBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Base de données non connectée.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: DOCUMENT_BUCKET });
}

export type DocumentView = {
  id: string;
  title: string;
  category: DocumentCategory;
  contentType: string;
  length: number;
  uploadedAt: Date;
};

/**
 * PDF : vérifié par sa signature « %PDF- » et gardé tel quel.
 * Image : ré-encodée en JPEG (métadonnées effacées, 2400 px max).
 */
export async function storeDocument(input: {
  buffer: Buffer;
  contentType: string;
  dossierId: string;
  uploadedBy: string;
  title: string;
  category: DocumentCategory;
}): Promise<string> {
  let data = input.buffer;
  let contentType = input.contentType;
  if (contentType === "application/pdf") {
    if (data.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("not-a-pdf");
  } else {
    data = await sharp(data, { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    contentType = "image/jpeg";
  }
  await connectDb();
  const id = new mongoose.Types.ObjectId();
  const ext = contentType === "application/pdf" ? "pdf" : "jpg";
  await new Promise<void>((resolve, reject) => {
    const upload = documentBucket().openUploadStreamWithId(id, `${id}.${ext}`, {
      metadata: {
        dossierId: new mongoose.Types.ObjectId(input.dossierId),
        uploadedBy: input.uploadedBy,
        title: input.title,
        category: input.category,
        contentType,
      },
    });
    Readable.from(data).pipe(upload).on("finish", () => resolve()).on("error", reject);
  });
  return String(id);
}

export async function countDocuments(dossierId: string): Promise<number> {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) return 0;
  return db.collection(`${DOCUMENT_BUCKET}.files`).countDocuments({ "metadata.dossierId": new mongoose.Types.ObjectId(dossierId) });
}

export async function listDocuments(dossierId: string): Promise<DocumentView[]> {
  await connectDb();
  const files = await documentBucket()
    .find({ "metadata.dossierId": new mongoose.Types.ObjectId(dossierId) })
    .sort({ uploadDate: -1 })
    .toArray();
  return files.map((f) => ({
    id: String(f._id),
    title: f.metadata?.title ?? "Document",
    category: (f.metadata?.category ?? "autre") as DocumentCategory,
    contentType: f.metadata?.contentType ?? "application/octet-stream",
    length: f.length,
    uploadedAt: f.uploadDate,
  }));
}

export async function findDocument(id: string): Promise<(DocumentView & { dossierId: string }) | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  await connectDb();
  const f = await documentBucket().find({ _id: new mongoose.Types.ObjectId(id) }).limit(1).next();
  if (!f?.metadata?.dossierId) return null;
  return {
    id,
    dossierId: String(f.metadata.dossierId),
    title: f.metadata.title ?? "Document",
    category: (f.metadata.category ?? "autre") as DocumentCategory,
    contentType: f.metadata.contentType ?? "application/octet-stream",
    length: f.length,
    uploadedAt: f.uploadDate,
  };
}

export function openDocumentStream(id: string): NodeJS.ReadableStream {
  return documentBucket().openDownloadStream(new mongoose.Types.ObjectId(id));
}

export async function deleteDocument(id: string): Promise<void> {
  await documentBucket().delete(new mongoose.Types.ObjectId(id));
}

export function frSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

/* ---------- Album ---------- */

export type AlbumPhoto = { photoId: string; postId: string; date: Date };

/** Toutes les photos des visites, de la plus récente à la plus ancienne. */
export async function listAlbum(dossierId: string): Promise<AlbumPhoto[]> {
  const posts = await listPosts(dossierId, 500);
  return posts
    .filter((p) => p.kind === "visite")
    .flatMap((p) => p.photoIds.map((photoId) => ({ photoId, postId: p.id, date: p.visitDate ?? p.createdAt })));
}

/* ---------- Proches ---------- */

export type MemberView = { id: string; name: string; email: string };

export async function listMembers(dossierId: string): Promise<MemberView[]> {
  await connectDb();
  const links = await Membership.find({ dossierId }).lean();
  const users = await User.find({ _id: { $in: links.map((m) => m.userId) } }).sort({ name: 1 }).lean();
  return users.map((u) => ({ id: String(u._id), name: u.name, email: u.email }));
}

/* ---------- Cartes de l'accueil de l'espace ---------- */

function monthKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PARIS_TZ, year: "numeric", month: "2-digit" }).format(d);
}

export type DossierCard = {
  id: string;
  name: string;
  unread: number;
  nextVisit: AppointmentView | null;
  lastPublication: Date | null;
  visitsThisMonth: number;
};

/** Ordre : messages non lus d'abord, puis la visite la plus proche, puis l'ordre alphabétique. */
export async function dossierCards(userId: string, dossiers: { id: string; name: string }[]): Promise<DossierCard[]> {
  await connectDb();
  const cards = await Promise.all(
    dossiers.map(async (d) => {
      const [unread, nextVisit, visits] = await Promise.all([
        unreadMessages(userId, d.id),
        nextAppointment(d.id),
        Post.find({ dossierId: d.id, kind: "visite" }, { visitDate: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean(),
      ]);
      const last = visits[0];
      const nowKey = monthKey(new Date());
      return {
        ...d,
        unread,
        nextVisit,
        lastPublication: last ? (last.visitDate ?? last.createdAt) : null,
        visitsThisMonth: visits.filter((v) => monthKey(v.visitDate ?? v.createdAt) === nowKey).length,
      };
    }),
  );
  const soon = (c: DossierCard) => c.nextVisit?.startsAt.getTime() ?? Number.POSITIVE_INFINITY;
  return cards.sort(
    (a, b) => Number(b.unread > 0) - Number(a.unread > 0) || soon(a) - soon(b) || a.name.localeCompare(b.name, "fr"),
  );
}


/* ---------- Tableau de bord ---------- */

const monthShort = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: PARIS_TZ });

export type DashboardData = {
  visitsThisMonth: number;
  visitsTotal: number;
  unread: number;
  photos: number;
  nextVisit: AppointmentView | null;
  upcoming: AppointmentView[];
  recentVisits: { id: string; date: Date; text: string; coverPhotoId: string | null; photos: number }[];
  albumPreview: string[];
  recentMessages: MessageView[];
  /** Visites racontées sur les 6 derniers mois (le plus ancien d'abord). */
  visitsByMonth: { label: string; count: number; current: boolean }[];
  members: MemberView[];
};

export async function dashboardData(userId: string, dossierId: string): Promise<DashboardData> {
  await connectDb();
  const [posts, unread, agenda, messages, members] = await Promise.all([
    listPosts(dossierId, 500),
    unreadMessages(userId, dossierId),
    listAppointments(dossierId),
    listMessages(dossierId, 3),
    listMembers(dossierId),
  ]);
  const visits = posts.filter((p) => p.kind === "visite");
  const dateOf = (v: (typeof visits)[number]) => v.visitDate ?? v.createdAt;
  const nowKey = monthKey(new Date());

  const months: { key: string; label: string; count: number; current: boolean }[] = [];
  const cursor = new Date();
  cursor.setUTCDate(15);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(cursor);
    d.setUTCMonth(cursor.getUTCMonth() - i);
    const key = monthKey(d);
    months.push({ key, label: monthShort.format(d).replace(".", ""), count: 0, current: key === nowKey });
  }
  for (const v of visits) {
    const m = months.find((x) => x.key === monthKey(dateOf(v)));
    if (m) m.count += 1;
  }

  const album = visits.flatMap((v) => v.photoIds);
  return {
    visitsThisMonth: visits.filter((v) => monthKey(dateOf(v)) === nowKey).length,
    visitsTotal: visits.length,
    unread,
    photos: album.length,
    nextVisit: agenda.upcoming[0] ?? null,
    upcoming: agenda.upcoming.slice(0, 3),
    recentVisits: visits.slice(0, 3).map((v) => ({
      id: v.id,
      date: dateOf(v),
      text: v.text,
      coverPhotoId: v.photoIds[0] ?? null,
      photos: v.photoIds.length,
    })),
    albumPreview: album.slice(0, 5),
    recentMessages: messages.reverse(),
    visitsByMonth: months.map(({ label, count, current }) => ({ label, count, current })),
    members,
  };
}

/** « Aujourd'hui », « Demain » ou « À venir » pour une visite prévue. */
export function appointmentStatus(a: AppointmentView): { label: string; tone: "rose" | "jaune" | "sauge" } {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: PARIS_TZ }).format(d);
  const today = day(new Date());
  const tomorrow = day(new Date(Date.now() + 86400000));
  const at = day(a.startsAt);
  if (at === today) return { label: "Aujourd’hui", tone: "rose" };
  if (at === tomorrow) return { label: "Demain", tone: "jaune" };
  return { label: "À venir", tone: "sauge" };
}

/* ---------- Notifications (cloche) ---------- */

export type NotificationItem = {
  kind: "visite" | "message" | "document" | "agenda";
  label: string;
  detail: string;
  date: Date;
  href: string;
};

/** Nouveautés écrites par les autres depuis la dernière ouverture de la cloche. */
export async function notificationsFor(
  user: { id: string; role: "family" | "admin" },
  dossierId: string,
): Promise<{ count: number; items: NotificationItem[] }> {
  await connectDb();
  const userId = user.id;
  const isAdminUser = user.role === "admin";
  const state = await ReadState.findOne({ dossierId, userId }).lean();
  const since = state?.seenAt ?? new Date(0);
  const me = new mongoose.Types.ObjectId(userId);
  const base = `/compte/dossier/${dossierId}`;
  const db = mongoose.connection.db;

  const [visits, messages, docs, appointments] = await Promise.all([
    Post.find({ dossierId, kind: "visite", authorId: { $ne: me }, createdAt: { $gt: since } }).sort({ createdAt: -1 }).limit(20).lean(),
    Message.find({ dossierId, authorId: { $ne: me }, createdAt: { $gt: since } }).sort({ createdAt: -1 }).limit(20).lean(),
    db
      ? db
          .collection(`${DOCUMENT_BUCKET}.files`)
          .find({ "metadata.dossierId": new mongoose.Types.ObjectId(dossierId), "metadata.uploadedBy": { $ne: userId }, uploadDate: { $gt: since } })
          .sort({ uploadDate: -1 })
          .limit(20)
          .toArray()
      : [],
    Appointment.find({ dossierId, createdAt: { $gt: since }, startsAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  const items: NotificationItem[] = [
    ...visits.map((v) => ({
      kind: "visite" as const,
      label: "Nouvelle visite racontée",
      detail: cap(fmt.day.format(v.visitDate ?? v.createdAt)),
      date: v.createdAt,
      href: `${base}/carnet/${v._id}`,
    })),
    ...messages.map((m) => ({
      kind: "message" as const,
      label: `Message de ${m.authorName.split(" ")[0]}`,
      detail: excerpt(m.text, 70),
      date: m.createdAt,
      href: `${base}/messages`,
    })),
    ...docs.map((d) => ({
      kind: "document" as const,
      label: "Nouveau document",
      detail: String(d.metadata?.title ?? "Document"),
      date: d.uploadDate as Date,
      href: `${base}/documents`,
    })),
    // Les visites de l'agenda sont saisies par Céline : ce n'est une nouveauté que pour les proches.
    ...(isAdminUser ? [] : appointments).map((a) => ({
      kind: "agenda" as const,
      label: "Visite ajoutée à l’agenda",
      detail: appointmentLabel(toAppointment(a)),
      date: a.createdAt,
      href: `${base}/agenda`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return { count: items.length, items: items.slice(0, 8) };
}

export async function markNotificationsSeen(userId: string, dossierId: string): Promise<void> {
  await connectDb();
  await ReadState.updateOne({ dossierId, userId }, { $set: { seenAt: new Date() } }, { upsert: true });
}
