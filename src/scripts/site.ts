// Comportements d'interface du site public : menu mobile, apparitions,
// sous-navigation, simulateur indicatif. Chargé comme fichier (compatible CSP).
document.documentElement.classList.remove("no-js");

// Menu mobile
const menuBtn = document.querySelector<HTMLButtonElement>("[data-menu-btn]");
const mobileNav = document.querySelector("[data-mobile-nav]");
if (menuBtn && mobileNav) {
  menuBtn.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("is-open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
}

// Apparition douce au défilement
const reveals = document.querySelectorAll<HTMLElement>(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("is-visible"));
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
