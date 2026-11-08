import type { APIRoute } from "astro";
import { canAccessDossier, deletePhotos, guard, isAdmin, isValidId, json } from "@/lib/family-space";
import { connectDb } from "@/lib/db";
import { Post } from "@/models/Post";

export const prerender = false;

/** Supprimer une publication (Céline, ou l'auteur du message) — ses photos sont supprimées avec. */
export const DELETE: APIRoute = async (ctx) => {
  const denied = await guard(ctx, { write: true });
  if (denied) return denied;
  const user = ctx.locals.user!;
  const id = ctx.params.id ?? "";
  if (!isValidId(id)) return json({ ok: false, error: "Publication introuvable." }, 404);

  await connectDb();
  const post = await Post.findById(id).lean();
  if (!post || !(await canAccessDossier(user, String(post.dossierId)))) {
    return json({ ok: false, error: "Publication introuvable." }, 404);
  }
  if (!isAdmin(user) && String(post.authorId) !== user.id) {
    return json({ ok: false, error: "Vous ne pouvez supprimer que vos propres messages." }, 403);
  }

  await Post.deleteOne({ _id: id });
  await deletePhotos(post.photoIds ?? []);
  return json({ ok: true });
};
