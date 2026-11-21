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

// Jojo, l'assistant : le moteur n'est chargé qu'au premier contact avec le bouton
const jojo = document.querySelector<HTMLElement>("[data-jojo]");
if (jojo) {
  type ChatModule = typeof import("./chat");
  let mod: Promise<ChatModule> | null = null;
  const loadChat = () => (mod ??= import("./chat"));
  const teaser = jojo.querySelector<HTMLElement>("[data-jojo-teaser]")!;
  const teaserText = jojo.querySelector<HTMLElement>("[data-jojo-teaser-text]")!;
  const badge = jojo.querySelector<HTMLElement>("[data-jojo-badge]")!;
  const store = {
    get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch {} },
    del: (k: string) => { try { sessionStorage.removeItem(k); } catch {} },
  };

  jojo.querySelectorAll("[data-jojo-open]").forEach((b) => {
    b.addEventListener("pointerenter", () => void loadChat(), { once: true });
    b.addEventListener("touchstart", () => void loadChat(), { once: true, passive: true });
    b.addEventListener("click", () => {
      store.set("jojo-teaser-off", "1");
      void loadChat().then((m) => m.open());
    });
  });
  jojo.querySelector("[data-jojo-teaser-close]")?.addEventListener("click", () => {
    teaser.hidden = true;
    store.set("jojo-teaser-off", "1");
  });

  // Arrivée sur une page où Jojo a emmené la personne : on montre la section
  const spot = store.get("jojo-spot");
  const arrived = store.get("jojo-arrived");
  store.del("jojo-spot");
  store.del("jojo-arrived");
  if (spot) {
    window.addEventListener("load", () => {
      void loadChat().then((m) => window.setTimeout(() => m.spotlight(spot), 150));
    });
  }
  if (arrived) {
    teaserText.textContent = "Nous y voilà ! Une autre question ?";
    badge.hidden = false;
    window.setTimeout(() => (teaser.hidden = false), 1400);
    window.setTimeout(() => (teaser.hidden = true), 9000);
  } else if (!store.get("jojo-teaser-off")) {
    // Petit bonjour après quelques secondes, une seule fois par visite
    window.setTimeout(() => {
      if (store.get("jojo-teaser-off") || document.documentElement.classList.contains("jojo-open")) return;
      teaser.hidden = false;
      store.set("jojo-teaser-off", "1");
      window.setTimeout(() => (teaser.hidden = true), 10000);
    }, 6000);
  }

  // Un lien « Demander à Jojo » ailleurs sur le site ouvre directement le parcours
  document.querySelectorAll<HTMLElement>("[data-jojo-start]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      void loadChat().then((m) => m.openWith(b.dataset.jojoStart || ""));
    })
  );
}
