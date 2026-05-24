import type { APIRoute } from "astro";
import { connectDb, getMongoUri } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth-crypto";
import { createUserSession } from "@/lib/auth-session";
import { registerSchema } from "@/lib/zod-auth";
import { User } from "@/models/User";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!getMongoUri()) {
    return json({ ok: false, error: "Comptes non configurés (MONGODB_URI manquant)." }, 503);
  }

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

  const { name, email, password, invite_code } = parsed.data;
  const requiredCode = import.meta.env.REGISTRATION_INVITE_CODE?.trim();
  if (requiredCode && invite_code !== requiredCode) {
    return json({ ok: false, error: "Code d’invitation invalide." }, 403);
  }

  try {
    await connectDb();
    const existingCount = await User.countDocuments();
    if (existingCount > 0 && !requiredCode) {
      return json(
        {
          ok: false,
          error:
            "L’inscription libre est désactivée. Demandez un code d’invitation à Céline ou contactez-nous.",
        },
        403,
      );
    }

    const passwordHash = await hashPassword(password);
    const role = existingCount === 0 ? "admin" : "family";

    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role });
    await createUserSession(String(user._id), cookies);

    return json({
      ok: true,
      user: { name: user.name, email: user.email, role: user.role },
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000) {
      return json({ ok: false, error: "Un compte existe déjà avec cet e-mail." }, 409);
    }
    console.error("Register:", e);
    return json({ ok: false, error: "Impossible de créer le compte." }, 500);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
