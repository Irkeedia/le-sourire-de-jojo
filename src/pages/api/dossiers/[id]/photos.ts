import type { APIRoute } from "astro";
import { guard, json, MAX_PHOTO_UPLOAD_BYTES, storePhoto } from "@/lib/family-space";

export const prerender = false;

/**
 * Céline envoie UNE photo (déjà réduite par le navigateur), en corps brut image/jpeg.
 * Pas de multipart : chaque requête reste sous la limite de 4,5 Mo de Vercel.
 */
export const POST: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const denied = await guard(ctx, { write: true, adminOnly: true, dossierId });
  if (denied) return denied;

  const type = ctx.request.headers.get("content-type") ?? "";
  if (!/^image\/(jpeg|png|webp)$/.test(type.split(";")[0].trim())) {
    return json({ ok: false, error: "Format de photo non pris en charge." }, 415);
  }
  const declared = Number(ctx.request.headers.get("content-length") ?? "0");
  if (declared > MAX_PHOTO_UPLOAD_BYTES) return json({ ok: false, error: "Photo trop lourde." }, 413);

  const buffer = Buffer.from(await ctx.request.arrayBuffer());
  if (buffer.length === 0) return json({ ok: false, error: "Photo vide." }, 400);
  if (buffer.length > MAX_PHOTO_UPLOAD_BYTES) return json({ ok: false, error: "Photo trop lourde." }, 413);

  try {
    const id = await storePhoto(buffer, dossierId, ctx.locals.user!.id);
    return json({ ok: true, id }, 201);
  } catch (e) {
    console.error("Photo upload:", e);
    return json({ ok: false, error: "Cette image n’a pas pu être lue." }, 422);
  }
};
