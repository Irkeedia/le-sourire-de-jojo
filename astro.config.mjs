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
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    ssr: {
      noExternal: ["mongoose"],
    },
  },
});
