import type { APIRoute } from "astro";
import { guard, isValidId, json } from "@/lib/family-space";
import { createPasswordReset, resetLink } from "@/lib/password-reset";
import { Membership } from "@/models/Membership";

export const prerender = false;

/**
 * Céline génère un lien de réinitialisation pour un proche de CE dossier
 * (quand l'e-mail n'est pas configuré, ou pour dépanner par téléphone).
 */
export const POST: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const userId = ctx.params.userId ?? "";
  const denied = await guard(ctx, { write: true, adminOnly: true, dossierId });
  if (denied) return denied;
  if (!isValidId(userId) || !(await Membership.exists({ dossierId, userId }))) {
    return json({ ok: false, error: "Proche introuvable dans ce dossier." }, 404);
  }
  const token = await createPasswordReset(userId);
  return json({ ok: true, link: resetLink(ctx.url.origin, token), expiresInMinutes: 60 }, 201);
};
