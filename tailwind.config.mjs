/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F9F8F5",
        marine: "#1D3557",
        ivoire: "#F5F3E7",
        "rose-vieux": "#C88D8D",
        sauge: "#8FA892",
        "aquarelle-rouge": "#E76F51",
        "aquarelle-jaune": "#E9C46A",
        "aquarelle-bleu": "#457B9D",
        "aquarelle-mauve": "#A29BFE",
      },
      fontFamily: {
        display: ["'Dancing Script'", "cursive"],
        hero: ["'Playfair Display'", "Georgia", "ui-serif", "serif"],
        sans: ["'Lato'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "grain":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
