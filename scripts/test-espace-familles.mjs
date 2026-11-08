/**
 * Test de bout en bout de l'espace familles, contre le serveur de PRODUCTION (CSP et règles actives)
 * et une base MongoDB temporaire. À lancer après `npm run build` :
 *
 *   npm run build && npm run test:familles
 *
 * Joue Céline (admin) et deux familles, et vérifie surtout le cloisonnement entre dossiers.
 */
import { spawn } from "node:child_process";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import sharp from "sharp";

const PORT = 4330;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_EMAIL = "celine@test.local";

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Un « navigateur » minimal avec son propre cookie de session. */
function actor() {
  let cookie = "";
  async function request(path, { method = "GET", json, body, headers = {}, origin = BASE } = {}) {
    const h = { ...headers };
    if (cookie) h.cookie = cookie;
    if (method !== "GET") h.origin = origin;
    if (json === undefined && method === "DELETE") json = {};
    if (json !== undefined) {
      h["content-type"] = "application/json";
      body = JSON.stringify(json);
    }
    const res = await fetch(BASE + path, { method, headers: h, body, redirect: "manual" });
    const set = res.headers.get("set-cookie");
    const m = set && /sdcj_session=([^;]*)/.exec(set);
    if (m) cookie = m[1] ? `sdcj_session=${m[1]}` : "";
    return res;
  }
  return { request, data: async (res) => res.json().catch(() => ({})) };
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(BASE + "/");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error("Le serveur n'a pas démarré.");
}

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri("test-familles");
const server = spawn("node", ["dist/server/entry.mjs"], {
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(PORT),
    MONGODB_URI: uri,
    ADMIN_EMAIL,
    AUTH_RATE_LIMIT: "1000",
  },
  stdio: ["ignore", "ignore", "inherit"],
});

try {
  await waitForServer();
  const db = new MongoClient(uri);
  await db.connect();

  const celine = actor();
  const familleA = actor();
  const familleB = actor();
  const intrus = actor();
  const pwd = "MotDePasse1";

  console.log("\nComptes et invitations");
  let r = await intrus.request("/api/auth/register", { method: "POST", json: { name: "Intrus", email: "intrus@test.local", password: pwd } });
  check("inscription sans invitation refusée", r.status === 403, `statut ${r.status}`);

  r = await celine.request("/api/auth/register", { method: "POST", json: { name: "Céline Meunier", email: ADMIN_EMAIL, password: pwd } });
  check("Céline crée son compte sans invitation (admin)", r.ok && (await celine.data(r)).user?.role === "admin", `statut ${r.status}`);

  r = await celine.request("/api/dossiers", { method: "POST", json: { name: "Monsieur Robert" } });
  const dossierA = (await celine.data(r)).dossier?.id;
  r = await celine.request("/api/dossiers", { method: "POST", json: { name: "Madame Jaline" } });
  const dossierB = (await celine.data(r)).dossier?.id;
  check("Céline crée deux dossiers", Boolean(dossierA && dossierB));

  r = await celine.request("/api/dossiers", { method: "POST", json: { name: "Piratage" }, origin: "https://site-malveillant.example" });
  check("requête venant d'un autre site refusée", r.status === 403, `statut ${r.status}`);

  const tokenOf = async (dossierId, label) => {
    const res = await celine.request(`/api/dossiers/${dossierId}/invitations`, { method: "POST", json: { label } });
    const link = (await celine.data(res)).link ?? "";
    return new URL(link).searchParams.get("invitation");
  };
  const tokenA = await tokenOf(dossierA, "son fils Paul");
  const tokenB = await tokenOf(dossierB, "sa fille Anne");

  r = await familleA.request("/api/auth/register", { method: "POST", json: { name: "Paul Robert", email: "paul@test.local", password: pwd, invitation: tokenA } });
  check("le proche A s'inscrit avec son invitation", r.ok, `statut ${r.status}`);
  r = await intrus.request("/api/auth/register", { method: "POST", json: { name: "Intrus", email: "intrus@test.local", password: pwd, invitation: tokenA } });
  check("invitation déjà utilisée refusée", r.status === 403, `statut ${r.status}`);
  r = await familleB.request("/api/auth/register", { method: "POST", json: { name: "Anne Jaline", email: "anne@test.local", password: pwd, invitation: tokenB } });
  check("le proche B s'inscrit avec son invitation", r.ok, `statut ${r.status}`);

  const tokenExpired = await tokenOf(dossierA, "cousin");
  await db.db().collection("invitations").updateOne({ label: "cousin" }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  r = await intrus.request("/api/auth/register", { method: "POST", json: { name: "Intrus", email: "intrus@test.local", password: pwd, invitation: tokenExpired } });
  check("invitation expirée refusée", r.status === 403, `statut ${r.status}`);

  console.log("\nPhotos");
  const withExif = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#e9c46a" } })
    .withExif({ IFD0: { Artist: "TEST-METADONNEES", Make: "TelephoneTest" } })
    .jpeg()
    .toBuffer();
  check("(photo de test : contient bien des métadonnées)", Boolean((await sharp(withExif).metadata()).exif));

  r = await celine.request(`/api/dossiers/${dossierA}/photos`, { method: "POST", body: withExif, headers: { "content-type": "image/jpeg" } });
  const photoA = (await celine.data(r)).id;
  check("Céline envoie une photo dans le dossier A", r.status === 201 && Boolean(photoA), `statut ${r.status}`);

  r = await celine.request(`/api/dossiers/${dossierA}/photos`, { method: "POST", body: Buffer.from("pas une image"), headers: { "content-type": "image/jpeg" } });
  check("un faux fichier image est refusé", r.status === 422, `statut ${r.status}`);

  r = await familleA.request(`/api/dossiers/${dossierA}/photos`, { method: "POST", body: withExif, headers: { "content-type": "image/jpeg" } });
  check("un proche ne peut pas envoyer de photo", r.status === 403, `statut ${r.status}`);

  r = await celine.request(`/api/dossiers/${dossierA}/posts`, { method: "POST", json: { text: "Belle partie de cartes avec Monsieur Robert.", photoIds: [photoA], visitDate: "2026-11-08" } });
  const visiteA = (await celine.data(r)).id;
  check("Céline publie une visite avec photo", r.status === 201, `statut ${r.status}`);

  r = await celine.request(`/api/dossiers/${dossierB}/posts`, { method: "POST", json: { text: "", photoIds: [photoA] } });
  check("une photo du dossier A ne peut pas être publiée dans B", r.status === 422, `statut ${r.status}`);

  r = await familleA.request(`/api/photos/${photoA}`);
  const served = Buffer.from(await r.arrayBuffer());
  const meta = served.length ? await sharp(served).metadata() : {};
  check("le proche A voit la photo (WebP)", r.ok && meta.format === "webp", `statut ${r.status}`);
  check("métadonnées de la photo effacées", r.ok && !meta.exif, meta.exif ? "EXIF encore présent" : "");
  check("photo réduite à 1600 px maximum", (meta.width ?? 9999) <= 1600, `largeur ${meta.width}`);
  check("cache privé uniquement", (r.headers.get("cache-control") ?? "").includes("private"));

  r = await familleB.request(`/api/photos/${photoA}`);
  check("le proche B ne voit PAS la photo du dossier A", r.status === 404, `statut ${r.status}`);
  r = await intrus.request(`/api/photos/${photoA}`);
  check("un visiteur non connecté ne voit pas la photo", r.status === 404, `statut ${r.status}`);

  console.log("\nCloisonnement des dossiers");
  r = await familleA.request(`/compte/dossier/${dossierA}`);
  const pageA = await r.text();
  check("le proche A lit le fil de son dossier", r.ok && pageA.includes("Belle partie de cartes"), `statut ${r.status}`);
  r = await familleA.request(`/compte/dossier/${dossierB}`);
  check("le proche A ne peut pas ouvrir le dossier B", r.status === 302 && r.headers.get("location") === "/compte", `statut ${r.status}`);
  r = await intrus.request(`/compte/dossier/${dossierA}`);
  check("un visiteur non connecté est renvoyé vers la connexion", r.status === 302 && (r.headers.get("location") ?? "").startsWith("/compte/connexion"));

  r = await familleA.request(`/api/dossiers/${dossierB}/posts`, { method: "POST", json: { text: "Je m'invite" } });
  check("le proche A ne peut pas écrire dans le dossier B", r.status === 404, `statut ${r.status}`);
  r = await familleA.request(`/api/dossiers/${dossierA}/posts`, { method: "POST", json: { text: "Merci Céline !" } });
  const messageA = (await familleA.data(r)).id;
  check("le proche A écrit à Céline dans son dossier", r.status === 201, `statut ${r.status}`);
  r = await familleA.request(`/api/dossiers/${dossierA}/invitations`, { method: "POST", json: { label: "un ami" } });
  check("un proche ne peut pas créer d'invitation", r.status === 403, `statut ${r.status}`);
  r = await familleA.request("/api/dossiers", { method: "POST", json: { name: "Mon dossier" } });
  check("un proche ne peut pas créer de dossier", r.status === 403, `statut ${r.status}`);
  r = await familleA.request(`/api/posts/${visiteA}`, { method: "DELETE" });
  check("un proche ne peut pas supprimer la visite de Céline", r.status === 403, `statut ${r.status}`);
  r = await familleB.request(`/api/posts/${messageA}`, { method: "DELETE" });
  check("le proche B ne peut pas supprimer un message du dossier A", r.status === 404, `statut ${r.status}`);
  r = await familleA.request(`/api/posts/${messageA}`, { method: "DELETE" });
  check("le proche A supprime son propre message", r.ok, `statut ${r.status}`);

  r = await familleB.request("/compte");
  check("le proche B (un seul dossier) arrive directement sur son dossier", r.status === 302 && r.headers.get("location") === `/compte/dossier/${dossierB}`);

  console.log("\nCompte existant invité dans un second dossier");
  const tokenA2 = await tokenOf(dossierA, "sa fille Anne");
  r = await familleB.request(`/compte?invitation=${encodeURIComponent(tokenA2)}`);
  const accueilB = await r.text();
  check("Anne (déjà inscrite) accepte l'invitation au dossier A", r.ok && accueilB.includes("Monsieur Robert"), `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierA}`);
  check("Anne voit maintenant le dossier A", r.ok, `statut ${r.status}`);

  console.log("\nRetrait d'accès et suppression");
  const pauls = await db.db().collection("users").findOne({ email: "paul@test.local" });
  r = await celine.request(`/api/dossiers/${dossierA}/members/${pauls._id}`, { method: "DELETE" });
  check("Céline retire l'accès de Paul", r.ok, `statut ${r.status}`);
  r = await familleA.request(`/compte/dossier/${dossierA}`);
  check("Paul ne voit plus le dossier A", r.status === 302, `statut ${r.status}`);

  r = await celine.request(`/api/posts/${visiteA}`, { method: "DELETE" });
  check("Céline supprime la visite", r.ok, `statut ${r.status}`);
  r = await celine.request(`/api/photos/${photoA}`);
  check("la photo de la visite supprimée n'existe plus", r.status === 404, `statut ${r.status}`);

  await db.close();
} catch (e) {
  failures++;
  console.error("\nErreur pendant le test :", e);
} finally {
  server.kill();
  await mongo.stop();
}

console.log(failures === 0 ? "\nTout est bon ✅\n" : `\n${failures} vérification(s) en échec ❌\n`);
process.exit(failures === 0 ? 0 : 1);
