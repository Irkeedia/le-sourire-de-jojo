import type { APIRoute } from "astro";
import { hashPassword, verifyPassword } from "@/lib/auth-crypto";
import { guard, json, readJson } from "@/lib/family-space";
import { changePasswordSchema } from "@/lib/zod-auth";
import { User } from "@/models/User";

export const prerender = false;

/** Changer son mot de passe depuis « Mon compte » (mot de passe actuel exigé). */
export const POST: APIRoute = async (ctx) => {
  const denied = await guard(ctx, { write: true });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await readJson(ctx.request);
  } catch {
    return json({ ok: false, error: "Corps invalide." }, 400);
  }
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, 422);

  const user = await User.findById(ctx.locals.user!.id);
  if (!user || !(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return json({ ok: false, errors: { current: ["Mot de passe actuel incorrect."] } }, 403);
  }
  user.passwordHash = await hashPassword(parsed.data.password);
  await user.save();
  return json({ ok: true });
};
