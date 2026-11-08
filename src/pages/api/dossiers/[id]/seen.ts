import type { APIRoute } from "astro";
import { markNotificationsSeen } from "@/lib/dossier-data";
import { guard, json } from "@/lib/family-space";

export const prerender = false;

/** La cloche a été ouverte : les nouveautés du dossier sont marquées comme vues. */
export const POST: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const denied = await guard(ctx, { write: true, dossierId });
  if (denied) return denied;
  await markNotificationsSeen(ctx.locals.user!.id, dossierId);
  return json({ ok: true });
};
