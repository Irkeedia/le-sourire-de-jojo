import type { APIRoute } from "astro";
import { connectDb, getMongoUri } from "@/lib/db";
import { hashPassword } from "@/lib/auth-crypto";
import { createUserSession } from "@/lib/auth-session";
import { acceptInvitation, findValidInvitation, isSameOriginRequest, json } from "@/lib/family-space";
import { registerSchema } from "@/lib/zod-auth";
import { jsonBodyTooLarge } from "@/lib/request-body";
import { User } from "@/models/User";

export const prerender = false;

/**
 * Création de compte :
 * - Céline : avec l'e-mail défini dans ADMIN_EMAIL, sans invitation → compte administrateur ;
 * - un proche : uniquement avec un lien d'invitation valide → rattaché au dossier de l'invitation.
 */
export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!getMongoUri()) {
    return json({ ok: false, error: "Espace familles pas encore activé." }, 503);
  }
  if (!isSameOriginRequest(request, url)) return json({ ok: false, error: "Requête refusée." }, 403);
  if (jsonBodyTooLarge(request)) return json({ ok: false, error: "Corps trop volumineux." }, 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);
  }

  const { name, password, invitation } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const adminEmail = import.meta.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdminSignup = Boolean(adminEmail) && email === adminEmail;

  try {
    await connectDb();

    if (!isAdminSignup) {
      const inv = await findValidInvitation(invitation);
      if (!inv) {
        return json(
          {
            ok: false,
            error:
              "Il faut un lien d’invitation valide pour créer un compte. Demandez-le à Céline (les liens expirent au bout de 14 jours).",
          },
          403,
        );
      }
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash, role: isAdminSignup ? "admin" : "family" });

    if (!isAdminSignup && invitation) {
      await acceptInvitation(invitation, String(user._id));
    }

    await createUserSession(String(user._id), cookies);
    return json({ ok: true, user: { name: user.name, email: user.email, role: user.role } });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000) {
      return json(
        { ok: false, error: "Un compte existe déjà avec cet e-mail : connectez-vous plutôt (le lien d’invitation sera pris en compte)." },
        409,
      );
    }
    console.error("Register:", e);
    return json({ ok: false, error: "Impossible de créer le compte." }, 500);
  }
};
