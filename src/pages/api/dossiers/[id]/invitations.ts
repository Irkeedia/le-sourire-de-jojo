import type { APIRoute } from "astro";
import { createInvitation, guard, INVITATION_TTL_DAYS, json, readJson } from "@/lib/family-space";
import { invitationSchema } from "@/lib/zod-auth";

export const prerender = false;

/** Céline génère un lien d'invitation (usage unique, 14 jours) pour un proche. */
export const POST: APIRoute = async (ctx) => {
  const dossierId = ctx.params.id ?? "";
  const denied = await guard(ctx, { write: true, adminOnly: true, dossierId });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await readJson(ctx.request);
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }
  const parsed = invitationSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);

  const token = await createInvitation(dossierId, parsed.data.label);
  const link = new URL(`/compte/inscription?invitation=${encodeURIComponent(token)}`, ctx.url.origin).href;
  return json({ ok: true, link, expiresInDays: INVITATION_TTL_DAYS }, 201);
};
