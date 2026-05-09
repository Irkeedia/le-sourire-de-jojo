/**
 * Chiffrement applicatif AES-256-GCM pour champs sensibles en base (optionnel).
 * Transit : HTTPS/TLS (hébergement). Au repos : activez ENCRYPTION_KEY (32 octets, base64).
 */
import crypto from "node:crypto";

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";

/** Décode la clé depuis la variable d’environnement (32 octets en base64). */
export function parseEncryptionKeyFromBase64(b64: string | undefined | null): Buffer | null {
  if (!b64?.trim()) return null;
  try {
    const buf = Buffer.from(b64.trim(), "base64");
    if (buf.length !== 32) {
      console.warn("[crypto-at-rest] ENCRYPTION_KEY doit décoder en exactement 32 octets (AES-256).");
      return null;
    }
    return buf;
  } catch {
    return null;
  }
}

export function encryptAtRest(plaintext: string | undefined, key: Buffer | null): string | undefined {
  if (!plaintext || !key) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptAtRest(ciphertext: string | undefined, key: Buffer | null): string | undefined {
  if (!ciphertext || !key || !ciphertext.startsWith(PREFIX)) return ciphertext;
  const raw = Buffer.from(ciphertext.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
