/**
 * Lance le site en local AVEC l'espace familles :
 * une base MongoDB locale (données gardées dans .local-db/) + `astro dev`.
 *
 *   npm run dev:familles
 *
 * Compte de Céline pour les essais : créez-le sur /compte/inscription avec l'e-mail
 * celine@test.local (ou la valeur de ADMIN_EMAIL si vous la définissez avant la commande).
 * Le premier lancement télécharge le moteur MongoDB (une seule fois, ~100 Mo).
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

const dbPath = new URL("../.local-db/", import.meta.url).pathname;
mkdirSync(dbPath, { recursive: true });

const mongo = await MongoMemoryServer.create({
  instance: { dbPath, storageEngine: "wiredTiger", port: 27027 },
});
const uri = mongo.getUri("sourire-de-jojo");
const adminEmail = process.env.ADMIN_EMAIL || "celine@test.local";
console.log(`\nBase locale prête : ${uri}\nCompte de Céline (à créer sur /compte/inscription) : ${adminEmail}\n`);

const astro = spawn("npx", ["astro", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, MONGODB_URI: uri, ADMIN_EMAIL: adminEmail },
});

async function stop() {
  astro.kill("SIGINT");
  await mongo.stop({ doCleanup: false });
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
astro.on("exit", async (code) => {
  await mongo.stop({ doCleanup: false });
  process.exit(code ?? 0);
});
