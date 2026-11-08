import type { APIRoute } from "astro";
import { connectDb } from "@/lib/db";
import { isSameOriginRequest, json, readJson } from "@/lib/family-space";
import { isDbConfigured } from "@/lib/db-config";
import { isSmtpConfigured, sendSiteMail } from "@/lib/mail";
import { createPasswordReset, resetLink } from "@/lib/password-reset";
import { forgotSchema } from "@/lib/zod-auth";
import { User } from "@/models/User";

export const prerender = false;

/**
 * Mot de passe oublié. Réponse identique que le compte existe ou non
 * (on ne révèle jamais si une adresse est inscrite). Limité par le middleware (/api/auth/).
 */
export const POST: APIRoute = async ({ request, url }) => {
  if (!isDbConfigured()) return json({ ok: false, error: "Espace familles pas encore activé." }, 503);
  if (!isSameOriginRequest(request, url)) return json({ ok: false, error: "Requête refusée." }, 403);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);

  const emailEnabled = isSmtpConfigured();
  if (emailEnabled) {
    try {
      await connectDb();
      const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).lean();
      if (user) {
        const token = await createPasswordReset(String(user._id));
        // Le lien utilise l'adresse du site telle que reçue : sur Vercel, seuls nos domaines arrivent ici.
        await sendSiteMail({
          to: user.email,
          subject: "Votre nouveau mot de passe — Le Sourire de Jojo",
          text: [
            `Bonjour ${user.name.split(" ")[0]},`,
            "",
            "Vous avez demandé à changer le mot de passe de votre espace familles.",
            "Cliquez sur ce lien (valable une heure, une seule fois) :",
            resetLink(url.origin, token),
            "",
            "Si vous n’êtes pas à l’origine de cette demande, ignorez simplement ce message.",
            "",
            "Céline — Le Sourire de Jojo",
          ].join("\n"),
        });
      }
    } catch (e) {
      console.error("Forgot password:", e);
    }
  }
  return json({ ok: true, emailEnabled });
};
