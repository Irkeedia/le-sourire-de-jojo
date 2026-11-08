/**
 * Génère les images légères du site à partir des originaux de assets-src/.
 *
 * Les originaux (PNG/JPG en pleine résolution) ne sont pas mis en ligne :
 * ce script les redimensionne et les convertit en WebP dans public/.
 * À relancer après l'ajout ou le remplacement d'une image :
 *   npm run images
 */
import { statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "assets-src";
const OUT = "public";

/** Chaque entrée : source, sortie, largeur max, format. */
const jobs = [
  // Photo principale : deux tailles pour servir la petite version aux téléphones.
  { src: "images/personneagé.png", out: "images/personne-agee-800.webp", width: 800 },
  { src: "images/personneagé.png", out: "images/personne-agee-1600.webp", width: 1600 },
  // Image de partage (Facebook, WhatsApp…) : JPEG 1200×630, format attendu par les réseaux.
  { src: "images/personneagé.png", out: "images/og-image.jpg", width: 1200, height: 630, format: "jpeg", offsetTop: 140 },

  { src: "images/enfant.png", out: "images/enfant.webp", width: 1400 },
  { src: "images/balade.png", out: "images/balade.webp", width: 1400 },
  { src: "images/carnet.png", out: "images/carnet.webp", width: 1200 },
  { src: "images/carnet2.jpg", out: "images/carnet2.webp", width: 1200 },

  // Logo : version affichée, version PNG pour Google, icônes d'onglet et d'écran d'accueil.
  { src: "images/logo le sourire de jojo.png", out: "images/logo.webp", width: 400 },
  { src: "images/logo le sourire de jojo.png", out: "images/logo-512.png", width: 512, format: "png" },
  { src: "images/logo le sourire de jojo.png", out: "favicon-64.png", width: 64, format: "png" },
  { src: "images/logo le sourire de jojo.png", out: "apple-touch-icon.png", width: 180, format: "png" },

  // Galerie de l'accueil.
  ...[2, 3, 4, 5].map((n) => ({ src: `images/galerie/Unknown-${n}.jpg`, out: `images/galerie/photo-${n}.webp`, width: 1200 })),

  // Fleurs décoratives : affichées à 320 px maximum, donc 640 px suffisent pour les écrans Retina.
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ src: `images/fleurs/${n}.png`, out: `images/fleurs/${n}.webp`, width: 640 })),

  // Images de la présentation web.
  ...["image1.jpg", "image12.jpg", "image15.jpg", "image19.jpeg", "image25.jpg", "image26.png"].map((f) => ({
    src: `presentation/${f}`,
    out: `presentation/assets/${f.replace(/\.(jpe?g|png)$/, ".webp")}`,
    width: 1600,
  })),
  // Diapositive 2 : Céline et sa maman, « mamie Jo ».
  { src: "presentation/maman.jpg", out: "presentation/assets/maman.webp", width: 1200 },
];

let before = 0;
let after = 0;

for (const job of jobs) {
  const input = path.join(SRC, job.src);
  const output = path.join(OUT, job.out);
  await mkdir(path.dirname(output), { recursive: true });

  let img = sharp(input).rotate();
  if (job.height) {
    // Recadrage à hauteur fixe : on part du haut, décalé de offsetTop pixels.
    const resized = await img.resize({ width: job.width }).toBuffer();
    img = sharp(resized).extract({ left: 0, top: job.offsetTop ?? 0, width: job.width, height: job.height });
  } else {
    img = img.resize({ width: job.width, withoutEnlargement: true });
  }

  if (job.format === "jpeg") img = img.flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true });
  else if (job.format === "png") img = img.png({ compressionLevel: 9, palette: job.width <= 180 });
  else img = img.webp({ quality: 78, effort: 6 });

  const info = await img.toFile(output);
  before += statSync(input).size;
  after += info.size;
  console.log(`${job.out.padEnd(44)} ${(info.size / 1024).toFixed(0).padStart(6)} Ko`);
}

console.log(`\nOriginaux : ${(before / 1e6).toFixed(1)} Mo → images du site : ${(after / 1e6).toFixed(1)} Mo`);
