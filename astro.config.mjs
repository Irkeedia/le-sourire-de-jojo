import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Vercel définit VERCEL=1 au build et à l’exécution ; sinon adaptateur Node (VPS, Docker, etc.). */
const useVercel = process.env.VERCEL === "1";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  output: "server",
  adapter: useVercel ? vercel() : node({ mode: "standalone" }),
  integrations: [tailwind()],
  /** Anciennes pages fusionnées lors de la refonte 2027 : les liens existants restent valides. */
  redirects: {
    "/carnet": "/services#carnet",
    "/partenaires": "/a-propos#partenaires",
    "/legal": "/informations-legales",
    "/cgv": "/informations-legales#cgv",
    "/conditions-annulation": "/informations-legales#annulation",
    "/plan-du-site": "/",
    "/presentation": "/",
  },
  security: {
    checkOrigin: true,
  },
  vite: {
    build: {
      // Ne jamais intégrer scripts ni polices directement dans la page : la CSP
      // (script-src 'self' + nonce, font-src 'self') bloquerait ces contenus intégrés.
      // Ils sont servis comme fichiers séparés, autorisés par 'self'.
      assetsInlineLimit: 0,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  },
});
