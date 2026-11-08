#!/usr/bin/env node
/**
 * Génère public/presentation/Le-Sourire-de-JoJo-presentation.pdf
 * à partir de la page /presentation (styles @media print).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, "public/presentation/Le-Sourire-de-JoJo-presentation.pdf");
const port = 4323;
const baseUrl = `http://127.0.0.1:${port}/presentation`;

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve(undefined);
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Dev server did not start in time"));
        return;
      }
      setTimeout(tick, 400);
    };
    tick();
  });
}

const dev = spawn("npm", ["run", "dev", "--", "--port", String(port), "--host", "127.0.0.1"], {
  cwd: root,
  stdio: "ignore",
  env: { ...process.env, BROWSER: "none" },
});

/**
 * Utilise Google Chrome s'il est installé (Playwright n'a alors pas besoin
 * de télécharger son propre navigateur), sinon le Chromium de Playwright.
 */
async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch (err) {
    console.warn(`Google Chrome introuvable, repli sur le Chromium de Playwright (${err.message.split("\n")[0]})`);
    return chromium.launch();
  }
}

try {
  await waitForServer(baseUrl);

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: outFile,
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
  });

  await browser.close();
  console.log(`PDF généré : ${outFile}`);
} finally {
  dev.kill("SIGTERM");
}
