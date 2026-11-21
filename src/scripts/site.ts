// Comportements d'interface du site public : menu mobile, apparitions,
// sous-navigation, simulateur indicatif. Chargé comme fichier (compatible CSP).
// Animations au défilement (apparitions, frise des étapes, compteurs, profondeur)
import "./motion";

document.documentElement.classList.remove("no-js");

// Menu mobile : panneau plein écran, fermeture par la croix, le fond, Échap ou un lien
const menuBtn = document.querySelector<HTMLButtonElement>("[data-menu-btn]");
const mobileNav = document.querySelector<HTMLElement>("[data-mobile-nav]");
const header = document.querySelector<HTMLElement>(".header");
if (menuBtn && mobileNav && header) {
  let closeTimer = 0;
  const setOpen = (open: boolean) => {
    window.clearTimeout(closeTimer);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    document.documentElement.classList.toggle("menu-open", open);
    if (open) {
      mobileNav.style.setProperty("--menu-top", `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
      mobileNav.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => mobileNav.classList.add("is-open")));
      mobileNav.querySelector<HTMLElement>(".mnav__link")?.focus({ preventScroll: true });
    } else {
      mobileNav.classList.remove("is-open");
      closeTimer = window.setTimeout(() => (mobileNav.hidden = true), 380);
    }
  };
  menuBtn.addEventListener("click", () => setOpen(menuBtn.getAttribute("aria-expanded") !== "true"));
  mobileNav.querySelector("[data-menu-close]")?.addEventListener("click", () => setOpen(false));
  mobileNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      menuBtn.focus();
    }
  });
  window.matchMedia("(min-width: 1081px)").addEventListener("change", (m) => m.matches && setOpen(false));
}

// Sous-navigation : section active
const subLinks = document.querySelectorAll<HTMLAnchorElement>(".subnav a[href^='#']");
if (subLinks.length && "IntersectionObserver" in window) {
  const map = new Map<Element, HTMLAnchorElement>();
  subLinks.forEach((a) => {
    const t = document.querySelector(a.getAttribute("href") || "");
    if (t) map.set(t, a);
  });
  const so = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          subLinks.forEach((l) => l.classList.remove("is-active"));
          map.get(e.target)?.classList.add("is-active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  map.forEach((_, t) => so.observe(t));
}

// Simulateur indicatif (38 € TTC / h, crédit d'impôt 50 % sous conditions)
const sim = document.querySelector<HTMLElement>("[data-sim]");
if (sim) {
  const RATE = Number(sim.dataset.rate) || 38;
  const hours = sim.querySelector<HTMLInputElement>("[data-sim-hours]")!;
  const hoursOut = sim.querySelector<HTMLElement>("[data-sim-hours-out]")!;
  const freqBtns = sim.querySelectorAll<HTMLButtonElement>("[data-freq]");
  const outTtc = sim.querySelector<HTMLElement>("[data-sim-ttc]")!;
  const outMonth = sim.querySelector<HTMLElement>("[data-sim-month]")!;
  const outNet = sim.querySelector<HTMLElement>("[data-sim-net]")!;
  let perMonth = 4;
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
  const render = () => {
    const h = Number(hours.value);
    hoursOut.textContent = h + " h";
    const visit = h * RATE;
    const month = visit * perMonth;
    outTtc.textContent = fmt(visit);
    outMonth.textContent = fmt(month);
    outNet.textContent = fmt(month / 2);
  };
  freqBtns.forEach((b) =>
    b.addEventListener("click", () => {
      freqBtns.forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      perMonth = Number(b.dataset.freq);
      render();
    })
  );
  hours.addEventListener("input", render);
  render();
}

// Sommaire de la page légale : document actif
const tocLinks = document.querySelectorAll<HTMLAnchorElement>(".doc-toc a[href^='#']");
if (tocLinks.length && "IntersectionObserver" in window) {
  const io2 = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      tocLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + e.target.id));
    }),
    { rootMargin: "-30% 0px -60% 0px" }
  );
  tocLinks.forEach((a) => { const t = document.querySelector(a.getAttribute("href") || ""); if (t) io2.observe(t); });
}
