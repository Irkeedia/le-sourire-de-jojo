import type { APIRoute } from "astro";
import { guard, json, photosOfDossier, readJson } from "@/lib/family-space";
import { postSchema } from "@/lib/zod-auth";
import { Post } from "@/models/Post";

export const prerender = false;

/**
 * Publier une visite dans le carnet de sourires (Céline uniquement) :
 * texte, date et photos déjà envoyées dans CE dossier.
 * Les proches écrivent dans la messagerie (/api/dossiers/[id]/messages).
 */
export const POST: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const denied = await guard(ctx, { write: true, adminOnly: true, dossierId });
  if (denied) return denied;
  const user = ctx.locals.user!;

  let body: unknown;
  try {
    body = await readJson(ctx.request);
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);

  const photoIds = await photosOfDossier(parsed.data.photoIds, dossierId);
  if (!parsed.data.text && photoIds.length === 0) {
    return json({ ok: false, errors: { text: ["Écrivez un mot."] } }, 422);
  }

  const post = await Post.create({
    dossierId,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    kind: "visite",
    text: parsed.data.text,
    visitDate: parsed.data.visitDate ? new Date(`${parsed.data.visitDate}T12:00:00Z`) : undefined,
    photoIds,
  });
  return json({ ok: true, id: String(post._id) }, 201);
};
