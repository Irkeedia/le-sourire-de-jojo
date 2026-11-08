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
    ...(state ? { createdAt: { $gt: state.messagesReadAt } } : {}),
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

/* ---------- Indicateurs des tuiles ---------- */

export type DossierOverview = {
  visits: number;
  lastVisit: { id: string; date: Date; text: string; coverPhotoId: string | null } | null;
  unread: number;
  lastMessage: { authorId: string; authorName: string; text: string; createdAt: Date } | null;
  photos: number;
  photoPreview: string[];
  nextVisit: AppointmentView | null;
  documents: number;
  members: MemberView[];
};

export async function dossierOverview(userId: string, dossierId: string): Promise<DossierOverview> {
  await connectDb();
  const [visits, lastVisitRow, unread, lastMessageRow, album, next, docs, members] = await Promise.all([
    Post.countDocuments({ dossierId, kind: "visite" }),
    Post.findOne({ dossierId, kind: "visite" }).sort({ createdAt: -1 }).lean(),
    unreadMessages(userId, dossierId),
    Message.findOne({ dossierId }).sort({ createdAt: -1 }).lean(),
    listAlbum(dossierId),
    nextAppointment(dossierId),
    countDocuments(dossierId),
    listMembers(dossierId),
  ]);
  return {
    visits,
    lastVisit: lastVisitRow
      ? {
          id: String(lastVisitRow._id),
          date: lastVisitRow.visitDate ?? lastVisitRow.createdAt,
          text: lastVisitRow.text ?? "",
          coverPhotoId: lastVisitRow.photoIds?.[0] ? String(lastVisitRow.photoIds[0]) : null,
        }
      : null,
    unread,
    lastMessage: lastMessageRow
      ? {
          authorId: String(lastMessageRow.authorId),
          authorName: lastMessageRow.authorName,
          text: lastMessageRow.text,
          createdAt: lastMessageRow.createdAt,
        }
      : null,
    photos: album.length,
    photoPreview: album.slice(0, 4).map((p) => p.photoId),
    nextVisit: next,
    documents: docs,
    members,
  };
}

/* ---------- Cartes de l'accueil de l'espace ---------- */

export type DossierCard = {
  id: string;
  name: string;
  unread: number;
  nextVisit: AppointmentView | null;
  lastPublication: Date | null;
};

/** Ordre : messages non lus d'abord, puis la visite la plus proche, puis l'ordre alphabétique. */
export async function dossierCards(userId: string, dossiers: { id: string; name: string }[]): Promise<DossierCard[]> {
  await connectDb();
  const cards = await Promise.all(
    dossiers.map(async (d) => {
      const [unread, nextVisit, last] = await Promise.all([
        unreadMessages(userId, d.id),
        nextAppointment(d.id),
        Post.findOne({ dossierId: d.id, kind: "visite" }).sort({ createdAt: -1 }).lean(),
      ]);
      return { ...d, unread, nextVisit, lastPublication: last ? (last.visitDate ?? last.createdAt) : null };
    }),
  );
  const soon = (c: DossierCard) => c.nextVisit?.startsAt.getTime() ?? Number.POSITIVE_INFINITY;
  return cards.sort(
    (a, b) => Number(b.unread > 0) - Number(a.unread > 0) || soon(a) - soon(b) || a.name.localeCompare(b.name, "fr"),
  );
}
