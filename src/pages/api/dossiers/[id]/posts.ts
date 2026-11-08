import type { APIRoute } from "astro";
import { guard, isAdmin, json, photosOfDossier, readJson } from "@/lib/family-space";
import { postSchema } from "@/lib/zod-auth";
import { Post } from "@/models/Post";

export const prerender = false;

/**
 * Publier dans le fil d'un dossier :
 * - Céline : compte-rendu de visite (texte, date, photos déjà envoyées dans CE dossier) ;
 * - un proche : un message texte.
 */
export const POST: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const denied = await guard(ctx, { write: true, dossierId });
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

  const admin = isAdmin(user);
  const photoIds = admin ? await photosOfDossier(parsed.data.photoIds, dossierId) : [];
  if (!parsed.data.text && photoIds.length === 0) {
    return json({ ok: false, errors: { text: ["Écrivez un mot."] } }, 422);
  }

  const post = await Post.create({
    dossierId,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    kind: admin ? "visite" : "message",
    text: parsed.data.text,
    visitDate: admin && parsed.data.visitDate ? new Date(`${parsed.data.visitDate}T12:00:00Z`) : undefined,
    photoIds,
  });
  return json({ ok: true, id: String(post._id) }, 201);
};
