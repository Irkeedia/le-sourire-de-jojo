import type { AstroCookies } from "astro";
import { createSessionToken, hashSessionToken } from "@/lib/auth-crypto";

export const SESSION_COOKIE = "sdcj_session";

export type UserRole = "family" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

const SESSION_TTL_MS = Number(import.meta.env.SESSION_TTL_DAYS ?? "30") * 24 * 60 * 60 * 1000;

function cookieOptions(maxAgeSec: number) {
  const secure = import.meta.env.PROD;
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

async function loadDbModels() {
  const { getMongoUri } = await import("@/lib/db-config");
  if (!getMongoUri()) return null;
  const { connectDb } = await import("@/lib/db");
  await connectDb();
  const [{ Session }, { User }] = await Promise.all([
    import("@/models/Session"),
    import("@/models/User"),
  ]);
  return { Session, User };
}

export async function createUserSession(
  userId: string,
  cookies: AstroCookies,
): Promise<void> {
  const models = await loadDbModels();
  if (!models) throw new Error("Base de données indisponible.");

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await models.Session.create({ userId, tokenHash, expiresAt });
  cookies.set(SESSION_COOKIE, token, cookieOptions(Math.floor(SESSION_TTL_MS / 1000)));
}

export async function destroyUserSession(cookies: AstroCookies): Promise<void> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const models = await loadDbModels();
    if (models) {
      await models.Session.deleteOne({ tokenHash: hashSessionToken(token) });
    }
  }
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

export async function getSessionUser(cookies: AstroCookies): Promise<SessionUser | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const models = await loadDbModels();
  if (!models) return null;

  const session = await models.Session.findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!session) return null;

  const user = await models.User.findById(session.userId).lean();
  if (!user) return null;

  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  };
}
