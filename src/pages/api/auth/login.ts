import type { APIRoute } from "astro";
import { connectDb, getMongoUri } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-crypto";
import { createUserSession } from "@/lib/auth-session";
import { loginSchema, loginWithInvitationSchema } from "@/lib/zod-auth";
import { acceptInvitation, isSameOriginRequest } from "@/lib/family-space";
import { jsonBodyTooLarge } from "@/lib/request-body";
import { User } from "@/models/User";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!getMongoUri()) {
    return json({ ok: false, error: "Espace familles pas encore activé." }, 503);
  }

  if (!isSameOriginRequest(request, url)) {
    return json({ ok: false, error: "Requête refusée." }, 403);
  }

  if (jsonBodyTooLarge(request)) {
    return json({ ok: false, error: "Corps trop volumineux." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);
  }

  const { email, password } = parsed.data;

  try {
    await connectDb();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return json({ ok: false, error: "E-mail ou mot de passe incorrect." }, 401);
    }

    await createUserSession(String(user._id), cookies);

    // Un proche qui a déjà un compte et reçoit une nouvelle invitation : on le rattache au dossier.
    const { invitation } = loginWithInvitationSchema.parse(body);
    if (invitation) await acceptInvitation(invitation, String(user._id));

    return json({
      ok: true,
      user: { name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error("Login:", e);
    return json({ ok: false, error: "Connexion impossible." }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
