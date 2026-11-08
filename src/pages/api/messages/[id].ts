import type { APIRoute } from "astro";
import { connectDb } from "@/lib/db";
import { canAccessDossier, guard, isAdmin, isValidId, json } from "@/lib/family-space";
import { Message } from "@/models/Message";

export const prerender = false;

/** Supprimer un message : Céline, ou l'auteur du message. */
export const DELETE: APIRoute = async (ctx) => {
  const denied = await guard(ctx, { write: true });
  if (denied) return denied;
  const user = ctx.locals.user!;
  const id = ctx.params.id ?? "";
  if (!isValidId(id)) return json({ ok: false, error: "Message introuvable." }, 404);

  await connectDb();
  const message = await Message.findById(id).lean();
  if (!message || !(await canAccessDossier(user, String(message.dossierId)))) {
    return json({ ok: false, error: "Message introuvable." }, 404);
  }
  if (!isAdmin(user) && String(message.authorId) !== user.id) {
    return json({ ok: false, error: "Vous ne pouvez supprimer que vos propres messages." }, 403);
  }
  await Message.deleteOne({ _id: id });
  return json({ ok: true });
};
