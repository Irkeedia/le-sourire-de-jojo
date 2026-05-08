import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  output: "server",
  adapter: node({ mode: "standalone" }),
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
