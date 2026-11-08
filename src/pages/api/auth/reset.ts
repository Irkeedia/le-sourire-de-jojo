import type { APIRoute } from "astro";
import { createUserSession } from "@/lib/auth-session";
import { isDbConfigured } from "@/lib/db-config";
import { isSameOriginRequest, json, readJson } from "@/lib/family-space";
import { consumePasswordReset } from "@/lib/password-reset";
import { resetSchema } from "@/lib/zod-auth";

export const prerender = false;

/** Nouveau mot de passe avec un lien de réinitialisation ; connecte ensuite la personne. */
export const POST: APIRoute = async ({ request, url, cookies }) => {
  if (!isDbConfigured()) return json({ ok: false, error: "Espace familles pas encore activé." }, 503);
  if (!isSameOriginRequest(request, url)) return json({ ok: false, error: "Requête refusée." }, 403);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);

  const userId = await consumePasswordReset(parsed.data.token, parsed.data.password);
  if (!userId) {
    return json({ ok: false, error: "Ce lien n’est plus valable (déjà utilisé ou plus d’une heure). Demandez-en un nouveau." }, 410);
  }
  await createUserSession(userId, cookies);
  return json({ ok: true });
};
