/**
 * Espace familles : règles d'accès, invitations et photos.
 *
 * Règle d'or : un proche ne voit QUE les dossiers auxquels il est rattaché (Membership).
 * Céline (rôle admin) voit tous les dossiers. Chaque page et chaque API passe par
 * `canAccessDossier` avant de lire ou d'écrire quoi que ce soit.
 */
import mongoose from "mongoose";
import sharp from "sharp";
import { Readable } from "node:stream";
import { createSessionToken, hashSessionToken } from "@/lib/auth-crypto";
import { connectDb } from "@/lib/db";
import { Dossier } from "@/models/Dossier";
import { Invitation } from "@/models/Invitation";
import { Membership } from "@/models/Membership";
import { Post } from "@/models/Post";

export type SpaceUser = NonNullable<App.Locals["user"]>;

export const INVITATION_TTL_DAYS = 14;
/** Limite du corps de requête sur Vercel (4,5 Mo) : les photos sont réduites dans le navigateur avant l'envoi. */
export const MAX_PHOTO_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTOS_PER_POST = 12;
const PHOTO_BUCKET = "photos";

export function isAdmin(user: App.Locals["user"]): boolean {
  return user?.role === "admin";
}

export function isValidId(id: unknown): id is string {
  return typeof id === "string" && mongoose.isValidObjectId(id) && /^[a-f0-9]{24}$/i.test(id);
}

export async function canAccessDossier(user: App.Locals["user"], dossierId: string): Promise<boolean> {
  if (!user || !isValidId(dossierId)) return false;
  await connectDb();
  if (isAdmin(user)) return Boolean(await Dossier.exists({ _id: dossierId }));
  return Boolean(await Membership.exists({ dossierId, userId: user.id }));
}

export type DossierSummary = { id: string; name: string };

export async function listDossiersFor(user: SpaceUser): Promise<DossierSummary[]> {
  await connectDb();
  let rows: { _id: unknown; name: string }[];
  if (isAdmin(user)) {
    rows = await Dossier.find().sort({ name: 1 }).lean();
  } else {
    const ids = (await Membership.find({ userId: user.id }).lean()).map((m) => m.dossierId);
    rows = await Dossier.find({ _id: { $in: ids } }).sort({ name: 1 }).lean();
  }
  return rows.map((d) => ({ id: String(d._id), name: d.name }));
}

/* ---------- Invitations ---------- */

export async function createInvitation(dossierId: string, label: string): Promise<string> {
  await connectDb();
  const token = createSessionToken();
  await Invitation.create({
    dossierId,
    label,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
  });
  return token;
}

export type ValidInvitation = { id: string; dossierId: string; dossierName: string; label: string };

export async function findValidInvitation(token: string | null | undefined): Promise<ValidInvitation | null> {
  if (!token || token.length > 128) return null;
  await connectDb();
  const inv = await Invitation.findOne({
    tokenHash: hashSessionToken(token),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!inv) return null;
  const dossier = await Dossier.findById(inv.dossierId).lean();
  if (!dossier) return null;
  return { id: String(inv._id), dossierId: String(inv.dossierId), dossierName: dossier.name, label: inv.label };
}

/** Rattache le compte au dossier de l'invitation et la marque comme utilisée (usage unique). */
export async function acceptInvitation(token: string, userId: string): Promise<ValidInvitation | null> {
  const inv = await findValidInvitation(token);
  if (!inv) return null;
  const claimed = await Invitation.findOneAndUpdate(
    { _id: inv.id, usedAt: { $exists: false } },
    { $set: { usedAt: new Date(), usedBy: userId } },
  );
  if (!claimed) return null;
  await Membership.updateOne(
    { dossierId: inv.dossierId, userId },
    { $setOnInsert: { dossierId: inv.dossierId, userId, createdAt: new Date() } },
    { upsert: true },
  );
  return inv;
}

/* ---------- Photos (stockées dans MongoDB, servies uniquement aux membres du dossier) ---------- */

function photoBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Base de données non connectée.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: PHOTO_BUCKET });
}

/**
 * Ré-encode la photo (WebP, 1600 px max) : poids réduit et métadonnées supprimées
 * (position GPS, modèle de téléphone…). Lève une erreur si ce n'est pas une image.
 */
export async function storePhoto(input: Buffer, dossierId: string, uploadedBy: string): Promise<string> {
  const webp = await sharp(input, { limitInputPixels: 60_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  await connectDb();
  const id = new mongoose.Types.ObjectId();
  await new Promise<void>((resolve, reject) => {
    const upload = photoBucket().openUploadStreamWithId(id, `${id}.webp`, {
      metadata: { dossierId: new mongoose.Types.ObjectId(dossierId), uploadedBy, contentType: "image/webp" },
    });
    Readable.from(webp).pipe(upload).on("finish", () => resolve()).on("error", reject);
  });
  return String(id);
}

export async function findPhoto(photoId: string): Promise<{ dossierId: string; length: number } | null> {
  if (!isValidId(photoId)) return null;
  await connectDb();
  const file = await photoBucket()
    .find({ _id: new mongoose.Types.ObjectId(photoId) })
    .limit(1)
    .next();
  if (!file?.metadata?.dossierId) return null;
  return { dossierId: String(file.metadata.dossierId), length: file.length };
}

export function openPhotoStream(photoId: string): NodeJS.ReadableStream {
  return photoBucket().openDownloadStream(new mongoose.Types.ObjectId(photoId));
}

/** Garde seulement les photos qui appartiennent bien au dossier (empêche de « voler » une photo d'un autre dossier). */
export async function photosOfDossier(photoIds: string[], dossierId: string): Promise<string[]> {
  const valid = photoIds.filter(isValidId);
  if (valid.length === 0) return [];
  await connectDb();
  const files = await photoBucket()
    .find({
      _id: { $in: valid.map((id) => new mongoose.Types.ObjectId(id)) },
      "metadata.dossierId": new mongoose.Types.ObjectId(dossierId),
    })
    .toArray();
  const owned = new Set(files.map((f) => String(f._id)));
  return valid.filter((id) => owned.has(id));
}

export async function deletePhotos(photoIds: unknown[]): Promise<void> {
  const bucket = photoBucket();
  for (const id of photoIds) {
    try {
      await bucket.delete(new mongoose.Types.ObjectId(String(id)));
    } catch {
      /* déjà supprimée */
    }
  }
}

/* ---------- Fil du dossier ---------- */

export type PostView = {
  id: string;
  kind: "visite" | "message";
  text: string;
  authorName: string;
  authorRole: "family" | "admin";
  authorId: string;
  visitDate: Date | null;
  createdAt: Date;
  photoIds: string[];
};

export async function listPosts(dossierId: string, limit = 60): Promise<PostView[]> {
  await connectDb();
  const rows = await Post.find({ dossierId }).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((p) => ({
    id: String(p._id),
    kind: p.kind,
    text: p.text ?? "",
    authorName: p.authorName,
    authorRole: p.authorRole,
    authorId: String(p.authorId),
    visitDate: p.visitDate ?? null,
    createdAt: p.createdAt,
    photoIds: (p.photoIds ?? []).map(String),
  }));
}

/* ---------- Sécurité des requêtes ---------- */

/**
 * Refuse les requêtes d'écriture venant d'un autre site (en plus du cookie SameSite=Lax).
 * Compare seulement le nom d'hôte : derrière un proxy, le port vu par le serveur peut différer.
 */
export function isSameOriginRequest(request: Request, url: URL): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).hostname === url.hostname;
  } catch {
    return false;
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
