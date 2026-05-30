import { randomBytes } from "node:crypto";

export function createCspNonce(): string {
  return randomBytes(18).toString("base64");
}
