import type { APIRoute } from "astro";
import { guard, json, readJson } from "@/lib/family-space";
import { dossierSchema } from "@/lib/zod-auth";
import { Dossier } from "@/models/Dossier";

export const prerender = false;

/** Céline crée le dossier d'une nouvelle personne accompagnée. */
export const POST: APIRoute = async (ctx) => {
  const denied = await guard(ctx, { write: true, adminOnly: true });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await readJson(ctx.request);
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }
  const parsed = dossierSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);

  const dossier = await Dossier.create({ name: parsed.data.name });
  return json({ ok: true, dossier: { id: String(dossier._id), name: dossier.name } }, 201);
};
