/**
 * Mot de passe oublié : jetons à usage unique (1 h), stockés hachés.
 * Une réinitialisation ferme toutes les sessions ouvertes du compte.
 */
import { createSessionToken, hashPassword, hashSessionToken } from "@/lib/auth-crypto";
import { connectDb } from "@/lib/db";
import { PasswordReset } from "@/models/PasswordReset";
import { Session } from "@/models/Session";
import { User } from "@/models/User";

export const RESET_TTL_MS = 60 * 60 * 1000;

export async function createPasswordReset(userId: string): Promise<string> {
  await connectDb();
  const token = createSessionToken();
  await PasswordReset.create({ userId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) });
  return token;
}

export function resetLink(origin: string, token: string): string {
  return new URL(`/compte/reinitialiser?jeton=${encodeURIComponent(token)}`, origin).href;
}

/** Le jeton est-il encore valable ? (pour afficher le formulaire) */
export async function findValidReset(token: string | null | undefined): Promise<{ userName: string } | null> {
  if (!token || token.length > 128) return null;
  await connectDb();
  const reset = await PasswordReset.findOne({
    tokenHash: hashSessionToken(token),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!reset) return null;
  const user = await User.findById(reset.userId).lean();
  return user ? { userName: user.name } : null;
}

/** Change le mot de passe si le jeton est valable (et le consomme). Renvoie l'identifiant du compte. */
export async function consumePasswordReset(token: string, newPassword: string): Promise<string | null> {
  if (!token || token.length > 128) return null;
  await connectDb();
  const reset = await PasswordReset.findOneAndUpdate(
    { tokenHash: hashSessionToken(token), usedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  ).lean();
  if (!reset) return null;
  const userId = String(reset.userId);
  await User.updateOne({ _id: userId }, { $set: { passwordHash: await hashPassword(newPassword) } });
  await Session.deleteMany({ userId });
  // Les autres liens encore valables pour ce compte ne servent plus à rien.
  await PasswordReset.updateMany({ userId, usedAt: { $exists: false } }, { $set: { usedAt: new Date() } });
  return userId;
}
