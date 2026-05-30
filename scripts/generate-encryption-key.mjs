#!/usr/bin/env node
/** Génère une clé ENCRYPTION_KEY (32 octets, base64) pour .env production. */
import { randomBytes } from "node:crypto";

const key = randomBytes(32).toString("base64");
console.log("Ajoutez à votre .env / variables Vercel :\n");
console.log(`ENCRYPTION_KEY=${key}`);
