import type { APIRoute } from "astro";
import { DOCUMENT_CATEGORIES, MAX_DOCUMENT_BYTES, storeDocument, type DocumentCategory } from "@/lib/dossier-data";
import { guard, json } from "@/lib/family-space";

export const prerender = false;

const ACCEPTED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

/**
 * Céline dépose un document (PDF ou image), en corps brut.
 * Titre et catégorie passent dans les en-têtes X-Document-Title (encodé) et X-Document-Category.
 */
export const POST: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const denied = await guard(ctx, { write: true, adminOnly: true, dossierId });
  if (denied) return denied;

  const contentType = (ctx.request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ACCEPTED.has(contentType)) {
    return json({ ok: false, error: "Seuls les PDF et les images (JPEG, PNG, WebP) sont acceptés." }, 415);
  }
  let title = "";
  try {
    title = decodeURIComponent(ctx.request.headers.get("x-document-title") ?? "").trim();
  } catch {
    title = "";
  }
  if (title.length < 2 || title.length > 120) {
    return json({ ok: false, errors: { title: ["Donnez un titre au document (2 à 120 caractères)."] } }, 422);
  }
  const category = (ctx.request.headers.get("x-document-category") ?? "autre") as DocumentCategory;
  if (!(category in DOCUMENT_CATEGORIES)) return json({ ok: false, errors: { category: ["Catégorie inconnue."] } }, 422);

  const declared = Number(ctx.request.headers.get("content-length") ?? "0");
  if (declared > MAX_DOCUMENT_BYTES) return json({ ok: false, error: "Fichier trop lourd (4 Mo maximum)." }, 413);
  const buffer = Buffer.from(await ctx.request.arrayBuffer());
  if (buffer.length === 0) return json({ ok: false, error: "Fichier vide." }, 400);
  if (buffer.length > MAX_DOCUMENT_BYTES) return json({ ok: false, error: "Fichier trop lourd (4 Mo maximum)." }, 413);

  try {
    const id = await storeDocument({ buffer, contentType, dossierId, uploadedBy: ctx.locals.user!.id, title, category });
    return json({ ok: true, id }, 201);
  } catch (e) {
    console.error("Document upload:", e);
    return json({ ok: false, error: "Ce fichier n’a pas pu être lu (PDF ou image abîmé)." }, 422);
  }
};
