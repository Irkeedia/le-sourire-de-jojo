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

  r = await familleA.request(`/api/dossiers/${dossierB}/messages`, { method: "POST", json: { text: "Je m'invite" } });
  check("le proche A ne peut pas écrire dans le dossier B", r.status === 404, `statut ${r.status}`);
  r = await familleA.request(`/api/dossiers/${dossierA}/messages`, { method: "POST", json: { text: "Merci Céline !" } });
  const messageA = (await familleA.data(r)).id;
  check("le proche A écrit à Céline dans son dossier", r.status === 201, `statut ${r.status}`);
  r = await familleA.request(`/api/dossiers/${dossierA}/invitations`, { method: "POST", json: { label: "un ami" } });
  check("un proche ne peut pas créer d'invitation", r.status === 403, `statut ${r.status}`);
  r = await familleA.request("/api/dossiers", { method: "POST", json: { name: "Mon dossier" } });
  check("un proche ne peut pas créer de dossier", r.status === 403, `statut ${r.status}`);
  r = await familleA.request(`/api/posts/${visiteA}`, { method: "DELETE" });
  check("un proche ne peut pas supprimer la visite de Céline", r.status === 403, `statut ${r.status}`);
  r = await familleB.request(`/api/messages/${messageA}`, { method: "DELETE" });
  check("le proche B ne peut pas supprimer un message du dossier A", r.status === 404, `statut ${r.status}`);
  r = await familleA.request(`/api/messages/${messageA}`, { method: "DELETE" });
  check("le proche A supprime son propre message", r.ok, `statut ${r.status}`);

  r = await familleB.request("/compte");
  check("le proche B (un seul dossier) arrive directement sur son dossier", r.status === 302 && r.headers.get("location") === `/compte/dossier/${dossierB}`);

  console.log("\nCarnet, album et pages de visite");
  r = await familleA.request(`/compte/dossier/${dossierA}/carnet/${visiteA}`);
  check("le proche A ouvre la page de la visite", r.ok && (await r.text()).includes("Belle partie de cartes"), `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierB}/carnet/${visiteA}`);
  const leak = await r.text();
  check("la visite du dossier A est introuvable depuis le dossier B", r.status === 302 && !leak.includes("Belle partie"), `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierA}/carnet/${visiteA}`);
  check("le proche B ne peut pas ouvrir une visite du dossier A", r.status === 302 && r.headers.get("location") === "/compte", `statut ${r.status}`);
  r = await familleA.request(`/compte/dossier/${dossierA}/album`);
  check("l'album du dossier A montre ses photos", r.ok && (await r.text()).includes(photoA), `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierA}/album`);
  check("le proche B ne peut pas ouvrir l'album du dossier A", r.status === 302, `statut ${r.status}`);
  r = await familleA.request(`/compte/dossier/${dossierA}/carnet/nouvelle`);
  check("un proche n'a pas accès au formulaire de publication", r.status === 302, `statut ${r.status}`);
  r = await familleA.request(`/api/dossiers/${dossierA}/posts`, { method: "POST", json: { text: "Je publie une visite" } });
  check("un proche ne peut pas publier de visite", r.status === 403, `statut ${r.status}`);

  console.log("\nMessagerie et non-lus");
  r = await familleA.request(`/api/dossiers/${dossierA}/messages`, { method: "POST", json: { text: "Papa a adoré la belote." } });
  const messageA2 = (await familleA.data(r)).id;
  check("le proche A écrit un nouveau message", r.status === 201, `statut ${r.status}`);
  r = await celine.request("/compte");
  check("Céline voit « 1 message non lu » sur la carte du dossier A", r.ok && (await r.text()).includes("1 message non lu"), `statut ${r.status}`);
  r = await celine.request(`/compte/dossier/${dossierA}`);
  check("la tuile Messagerie de Céline affiche la pastille non lu", (await r.text()).includes("1 message non lu"));
  r = await celine.request(`/compte/dossier/${dossierA}/messages`);
  const convA = await r.text();
  check("Céline lit la conversation", r.ok && convA.includes("Papa a adoré la belote."), `statut ${r.status}`);
  r = await celine.request(`/compte/dossier/${dossierA}`);
  const dashAfter = await r.text();
  check("après lecture, la pastille disparaît", r.ok && dashAfter.includes("Messagerie") && !dashAfter.includes("message non lu"), `statut ${r.status}`);
  r = await celine.request(`/api/dossiers/${dossierA}/messages`, { method: "POST", json: { text: "Je passe jeudi à 14 h." } });
  const messageCeline = (await celine.data(r)).id;
  check("Céline répond", r.status === 201, `statut ${r.status}`);
  r = await familleA.request(`/compte/dossier/${dossierA}`);
  check("le proche A voit la pastille « 1 message non lu »", (await r.text()).includes("1 message non lu"));
  r = await familleA.request(`/api/messages/${messageCeline}`, { method: "DELETE" });
  check("un proche ne peut pas supprimer le message de Céline", r.status === 403, `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierA}/messages`);
  check("le proche B ne peut pas lire la messagerie du dossier A", r.status === 302, `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierB}/messages`);
  const convB = await r.text();
  check("la messagerie du dossier B ne contient rien du dossier A", r.ok && !convB.includes("belote") && !convB.includes("jeudi à 14 h"));
  r = await familleA.request(`/api/dossiers/${dossierA}/messages`, { method: "POST", json: { text: "   " } });
  check("un message vide est refusé", r.status === 422, `statut ${r.status}`);
  void messageA2;

  console.log("\nAgenda des visites");
  const tomorrow = new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 10);
  r = await celine.request(`/api/dossiers/${dossierA}/appointments`, { method: "POST", json: { date: tomorrow, time: "14:00", durationMinutes: 120, note: "Promenade au parc" } });
  const apptA = (await celine.data(r)).id;
  check("Céline ajoute une visite à l'agenda", r.status === 201, `statut ${r.status}`);
  r = await familleA.request(`/compte/dossier/${dossierA}`);
  const dashA = await r.text();
  check("le proche A voit « Prochaine visite … à 14 h » sur son tableau de bord", dashA.includes("Prochaine visite") && dashA.includes("à 14 h"));
  r = await familleA.request(`/api/dossiers/${dossierA}/appointments`, { method: "POST", json: { date: tomorrow, time: "10:00", durationMinutes: 60 } });
  check("un proche ne peut pas ajouter de visite", r.status === 403, `statut ${r.status}`);
  r = await familleA.request(`/api/appointments/${apptA}`, { method: "DELETE" });
  check("un proche ne peut pas retirer une visite", r.status === 403, `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierA}/agenda`);
  check("le proche B ne peut pas voir l'agenda du dossier A", r.status === 302, `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierB}`);
  const dashB = await r.text();
  check("le tableau de bord du dossier B n'affiche pas la visite du dossier A", r.ok && dashB.includes("Agenda des visites") && !dashB.includes("Promenade au parc"), `statut ${r.status}`);
  r = await celine.request(`/api/dossiers/${dossierA}/appointments`, { method: "POST", json: { date: tomorrow, time: "25:00", durationMinutes: 60 } });
  check("une heure invalide est refusée", r.status === 422, `statut ${r.status}`);
  await celine.request(`/api/dossiers/${dossierA}/appointments`, { method: "POST", json: { date: "2027-07-15", time: "14:00", durationMinutes: 60, note: "été" } });
  await celine.request(`/api/dossiers/${dossierA}/appointments`, { method: "POST", json: { date: "2027-01-15", time: "14:00", durationMinutes: 60, note: "hiver" } });
  const ete = await db.db().collection("appointments").findOne({ note: "été" });
  const hiver = await db.db().collection("appointments").findOne({ note: "hiver" });
  check("14 h l'été à Paris = 12 h UTC", ete?.startsAt.toISOString() === "2027-07-15T12:00:00.000Z", ete?.startsAt.toISOString());
  check("14 h l'hiver à Paris = 13 h UTC", hiver?.startsAt.toISOString() === "2027-01-15T13:00:00.000Z", hiver?.startsAt.toISOString());
  r = await celine.request(`/api/appointments/${apptA}`, { method: "DELETE" });
  check("Céline retire une visite de l'agenda", r.ok, `statut ${r.status}`);

  console.log("\nDocuments");
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
  const docHeaders = (title, category = "facture", type = "application/pdf") => ({
    "content-type": type,
    "x-document-title": encodeURIComponent(title),
    "x-document-category": category,
  });
  r = await celine.request(`/api/dossiers/${dossierA}/documents`, { method: "POST", body: pdf, headers: docHeaders("Facture d’octobre") });
  const docA = (await celine.data(r)).id;
  check("Céline dépose une facture PDF", r.status === 201 && Boolean(docA), `statut ${r.status}`);
  r = await celine.request(`/api/dossiers/${dossierA}/documents`, { method: "POST", body: Buffer.from("<html>pas un pdf</html>"), headers: docHeaders("Faux PDF") });
  check("un faux PDF est refusé", r.status === 422, `statut ${r.status}`);
  r = await celine.request(`/api/dossiers/${dossierA}/documents`, { method: "POST", body: Buffer.from("<script>"), headers: docHeaders("Page web", "autre", "text/html") });
  check("un fichier HTML est refusé", r.status === 415, `statut ${r.status}`);
  r = await celine.request(`/api/dossiers/${dossierA}/documents`, { method: "POST", body: pdf, headers: docHeaders("Piratage"), origin: "https://site-malveillant.example" });
  check("dépôt de document depuis un autre site refusé", r.status === 403, `statut ${r.status}`);
  r = await celine.request(`/api/dossiers/${dossierA}/documents`, { method: "POST", body: withExif, headers: docHeaders("Devis signé", "devis", "image/jpeg") });
  const docImage = (await celine.data(r)).id;
  check("Céline dépose un document photo", r.status === 201, `statut ${r.status}`);
  r = await familleA.request(`/api/documents/${docImage}`);
  const docImgMeta = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
  check("le document photo est servi sans métadonnées", r.ok && docImgMeta.format === "jpeg" && !docImgMeta.exif);
  r = await familleA.request(`/api/documents/${docA}?telecharger`);
  const pdfBack = Buffer.from(await r.arrayBuffer());
  check(
    "le proche A télécharge la facture",
    r.ok && r.headers.get("content-type") === "application/pdf" && (r.headers.get("content-disposition") ?? "").startsWith("attachment") && pdfBack.equals(pdf),
    `statut ${r.status}`,
  );
  r = await familleB.request(`/api/documents/${docA}`);
  check("le proche B ne peut PAS télécharger la facture du dossier A", r.status === 404, `statut ${r.status}`);
  r = await intrus.request(`/api/documents/${docA}`);
  check("un visiteur non connecté ne peut pas télécharger", r.status === 404, `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierA}/documents`);
  check("le proche B ne peut pas ouvrir les documents du dossier A", r.status === 302, `statut ${r.status}`);
  r = await familleB.request(`/compte/dossier/${dossierB}/documents`);
  check("les documents du dossier B ne listent rien du dossier A", !(await r.text()).includes("Facture d’octobre"));
  r = await familleA.request(`/api/dossiers/${dossierA}/documents`, { method: "POST", body: pdf, headers: docHeaders("Mon document") });
  check("un proche ne peut pas déposer de document", r.status === 403, `statut ${r.status}`);
  r = await familleA.request(`/api/documents/${docA}`, { method: "DELETE" });
  check("un proche ne peut pas supprimer de document", r.status === 403, `statut ${r.status}`);
  r = await celine.request(`/api/documents/${docA}`, { method: "DELETE" });
  check("Céline supprime la facture", r.ok, `statut ${r.status}`);
  r = await familleA.request(`/api/documents/${docA}`);
  check("la facture supprimée n'est plus téléchargeable", r.status === 404, `statut ${r.status}`);

  console.log("\nSécurité des pages (CSP)");
  // Tout script doit être un fichier (src) ou porter le nonce : la CSP de production bloque le reste.
  const inlineScripts = (html) =>
    [...html.matchAll(/<script\b([^>]*)>/g)].filter(([, attrs]) => !/\bsrc=|\bnonce=|ld\+json/.test(attrs)).length;
  const pages = ["", "/carnet", `/carnet/${visiteA}`, "/carnet/nouvelle", "/messages", "/album", "/agenda", "/documents", "/proches"];
  let badPages = [];
  for (const page of pages) {
    const res = await celine.request(`/compte/dossier/${dossierA}${page}`);
    const html = await res.text();
    if (!res.ok || inlineScripts(html) > 0) badPages.push(`${page || "/"} (${res.status})`);
  }
  const home = await (await celine.request("/compte")).text();
  if (inlineScripts(home) > 0) badPages.push("/compte");
  check("aucun script intégré sans nonce dans les 10 pages de l'espace", badPages.length === 0, badPages.join(", "));
  const csp = (await celine.request(`/compte/dossier/${dossierA}`)).headers.get("content-security-policy") ?? "";
  check("la CSP de production est bien envoyée", csp.includes("script-src 'self' 'nonce-"));

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
