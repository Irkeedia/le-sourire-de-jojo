import type { APIRoute } from "astro";
import { guard, isValidId, json } from "@/lib/family-space";
import { Membership } from "@/models/Membership";

export const prerender = false;

/** Céline retire l'accès d'un proche à un dossier (le compte reste, mais ne voit plus ce dossier). */
export const DELETE: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const userId = ctx.params.userId ?? "";
  const denied = await guard(ctx, { write: true, adminOnly: true, dossierId });
  if (denied) return denied;
  if (!isValidId(userId)) return json({ ok: false, error: "Proche introuvable." }, 404);

  const res = await Membership.deleteOne({ dossierId, userId });
  if (res.deletedCount === 0) return json({ ok: false, error: "Proche introuvable." }, 404);
  return json({ ok: true });
};
