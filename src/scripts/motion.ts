// Animations liées au défilement, pensées pour le mobile :
// - apparitions qui se rejouent (elles s'effacent quand on remonte au-dessus) ;
// - frise des étapes dont le trait avance avec le doigt et remplit chaque numéro ;
// - chiffres clés qui comptent, carte dont les communes apparaissent une à une ;
// - léger effet de profondeur sur les photos et les fleurs, barre de lecture.
// Seuls transform et opacity bougent ; une seule boucle rAF, active
// uniquement quand un élément animé est à l'écran. Respecte « réduire les animations ».

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasIO = "IntersectionObserver" in window;
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/* ---------- 1. Marquage automatique (aucune retouche des pages nécessaire) ---------- */
const autoReveal = [
  ".section-head",
  ".page-hero .breadcrumb",
  ".page-hero .stack",
  ".page-hero .lead",
  ".pole-detail__body",
  ".subnav",
];
document.querySelectorAll<HTMLElement>(autoReveal.join(",")).forEach((el) => {
  if (!el.closest(".reveal")) el.classList.add("reveal");
});
document.querySelectorAll<HTMLElement>(".story__media, .hero__media, .carnet-visual, .pole-detail__media").forEach((el) => {
  el.dataset.reveal = "zoom";
});

// Cascade : les éléments animés voisins (cartes d'une grille…) partent l'un après l'autre.
const parents = new Map<Element, HTMLElement[]>();
document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
  const p = el.parentElement;
  if (!p) return;
  if (!parents.has(p)) parents.set(p, []);
  parents.get(p)!.push(el);
});
parents.forEach((list) => {
  if (list.length > 1) list.forEach((el, i) => el.style.setProperty("--d", `${(i % 4) * 90}ms`));
});

// Cascade interne : les enfants d'un bloc apparaissent en vague.
document
  .querySelectorAll<HTMLElement>(".kpis, .materials, .gallery, .faq, .hero__trust, .activities, .pole__list, .checklist, .communes")
  .forEach((box) => {
    // Seulement dans un bloc qui apparaît, sinon les enfants resteraient cachés.
    if (!box.closest(".reveal") || box.querySelector(".reveal")) return;
    box.dataset.stagger = "";
    Array.from(box.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--i", String(Math.min(i, 8))));
  });

/* ---------- 2. Chiffres qui comptent ---------- */
type Counter = { node: Text; to: number; raf: number };
const counters = new Map<Element, Counter[]>();
document.querySelectorAll<HTMLElement>(".kpis").forEach((box) => {
  const list: Counter[] = [];
  box.querySelectorAll(".kpi__value").forEach((v) => {
    const node = Array.from(v.childNodes).find((n) => n.nodeType === 3 && /\d/.test(n.textContent || "")) as Text | undefined;
    if (!node) return;
    const to = parseInt(node.textContent || "", 10);
    if (Number.isFinite(to)) list.push({ node, to, raf: 0 });
  });
  if (list.length) counters.set(box, list);
});
const runCounters = (box: Element, play: boolean) => {
  counters.get(box)?.forEach((c) => {
    cancelAnimationFrame(c.raf);
    if (!play || reduced) {
      c.node.textContent = String(c.to);
      return;
    }
    const start = performance.now();
    const dur = 700 + Math.min(c.to, 60) * 8;
    const tick = (now: number) => {
      const t = clamp((now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      c.node.textContent = String(Math.round(eased * c.to));
      if (t < 1) c.raf = requestAnimationFrame(tick);
    };
    c.node.textContent = "0";
    c.raf = requestAnimationFrame(tick);
  });
};

/* ---------- 2b. Prix en compteur mécanique ----------
   Le vrai texte reste en place (transparent) pour la mise en page et les lecteurs
   d'écran ; un compteur décoratif le recouvre et ses chiffres « roulent » jusqu'à
   leur valeur quand le bloc apparaît. Le montant final est toujours le vrai. */
if (!reduced) {
  document.querySelectorAll<HTMLElement>(".price__amount").forEach((amount) => {
    const text = (amount.textContent || "").replace(/\u00a0/g, " ").trim();
    if (!/^\d+\s?€$/.test(text)) return;
    const odo = document.createElement("span");
    odo.className = "odo";
    odo.setAttribute("aria-hidden", "true");
    let k = 0;
    for (const ch of text) {
      if (/\d/.test(ch)) {
        const col = document.createElement("span");
        col.className = "odo__col";
        const strip = document.createElement("span");
        strip.className = "odo__strip";
        strip.textContent = "01234567890123456789".split("").join("\n");
        strip.style.setProperty("--n", String(10 + Number(ch)));
        strip.style.setProperty("--k", String(k++));
        col.appendChild(strip);
        odo.appendChild(col);
      } else {
        const sym = document.createElement("span");
        sym.textContent = ch === " " ? "\u00a0" : ch;
        odo.appendChild(sym);
      }
    }
    amount.classList.add("has-odo");
    amount.appendChild(odo);
    if (!amount.closest(".reveal")) amount.classList.add("is-visible");
  });
}

/* ---------- 3. Apparitions réversibles ---------- */
const reveals = document.querySelectorAll<HTMLElement>(".reveal");
if (!hasIO || reduced) {
  reveals.forEach((el) => el.classList.add("is-visible"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) {
          if (!el.classList.contains("is-visible")) {
            el.classList.add("is-visible");
            if (counters.has(el)) runCounters(el, true);
          }
        } else if (e.boundingClientRect.top > 0) {
          // Sorti par le bas (on remonte) : on le cache pour qu'il se rejoue à la descente.
          el.classList.remove("is-visible");
        }
      });
    },
    { rootMargin: "0px 0px -7% 0px", threshold: 0.1 }
  );
  reveals.forEach((el) => io.observe(el));

  // Saut d'un coup vers le haut (tap sur la barre d'état de l'iPhone, ancre…) : les blocs
  // passés directement de « au-dessus » à « en dessous » n'ont pas croisé l'écran.
  // À la fin du défilement, on remet en attente ceux qui sont désormais sous l'écran.
  let sweepTimer = 0;
  window.addEventListener(
    "scroll",
    () => {
      window.clearTimeout(sweepTimer);
      sweepTimer = window.setTimeout(() => {
        const vh = window.innerHeight;
        reveals.forEach((el) => {
          if (el.classList.contains("is-visible") && el.getBoundingClientRect().top > vh) el.classList.remove("is-visible");
        });
      }, 160);
    },
    { passive: true }
  );
}

/* ---------- 4. Éléments liés au défilement (boucle unique) ---------- */
type Scrubber = { el: HTMLElement; update: () => void; measure?: () => void };
const scrubbers: Scrubber[] = [];
const active = new Set<Scrubber>();

// 4a. Frise des étapes
document.querySelectorAll<HTMLElement>(".steps").forEach((list) => {
  list.classList.remove("reveal", "is-visible");
  const steps = Array.from(list.querySelectorAll<HTMLElement>(".step"));
  const nums = steps.map((s) => s.querySelector<HTMLElement>(".step__num")!).filter(Boolean);
  if (nums.length < 2) return;
  list.dataset.scrub = "";
  let vertical = true;
  let centers: number[] = []; // position du centre de chaque numéro, relative au haut (ou à la gauche) de la liste
  let cross = 0; // position transversale du trait (centre des numéros)

  const measure = () => {
    const r = list.getBoundingClientRect();
    const rs = nums.map((n) => n.getBoundingClientRect());
    vertical = rs[1].top > rs[0].bottom - 1;
    centers = rs.map((n) => (vertical ? n.top + n.height / 2 - r.top : n.left + n.width / 2 - r.left));
    cross = vertical ? rs[0].left + rs[0].width / 2 - r.left : rs[0].top + rs[0].height / 2 - r.top;
    const start = centers[0];
    const len = centers[centers.length - 1] - start;
    list.style.setProperty("--a", `${start}px`);
    list.style.setProperty("--len", `${len}px`);
    list.style.setProperty("--x", `${cross}px`);
    list.dataset.axis = vertical ? "y" : "x";
  };

  const update = () => {
    const r = list.getBoundingClientRect();
    const vh = window.innerHeight;
    const first = centers[0];
    const len = centers[centers.length - 1] - first || 1;
    let pos: number; // avancée du trait depuis le 1er numéro, en px
    if (vertical) {
      const line = vh * 0.62; // la « ligne de lecture » à 62 % de l'écran
      pos = line - (r.top + first);
    } else {
      // Frise horizontale : elle se remplit pendant que la section monte de 85 % à 35 % de l'écran.
      pos = clamp((vh * 0.85 - r.top) / (vh * 0.5)) * len;
      if (r.top > vh * 0.85) pos = -1;
    }
    const p = clamp(pos / len);
    list.style.setProperty("--p", p.toFixed(4));
    steps.forEach((s, i) => s.classList.toggle("is-reached", pos >= centers[i] - first - 0.5));
  };

  if (reduced) {
    measure();
    list.style.setProperty("--p", "1");
    steps.forEach((s) => s.classList.add("is-reached"));
    return;
  }
  scrubbers.push({ el: list, update, measure });
});

// 4b. Profondeur douce : photos et fleurs décoratives
if (!reduced) {
  document
    .querySelectorAll<HTMLElement>(".hero__photo img, .story__media img, .hero__flower, .page-hero__flower, .cta__flower")
    .forEach((el) => {
      const isFlower = el.className.includes("flower");
      const isPhoto = el.closest(".hero__photo, .story__media") !== null && !isFlower;
      const host = isPhoto ? (el.parentElement as HTMLElement) : el;
      if (isPhoto) host.classList.add("parallax-host");
      el.classList.add("parallax");
      const update = () => {
        const r = host.getBoundingClientRect();
        const vh = window.innerHeight;
        // -1 quand l'élément entre par le bas, +1 quand il sort par le haut
        const t = clamp(((vh - r.top) / (vh + r.height)) * 2 - 1, -1, 1);
        if (isFlower) {
          el.style.setProperty("--py", `${(-t * 40).toFixed(1)}px`);
          el.style.setProperty("--rot", `${(t * 12).toFixed(2)}deg`);
        } else {
          el.style.setProperty("--py", `${(t * 5).toFixed(2)}%`);
        }
      };
      scrubbers.push({ el: host, update });
    });
}

// 4c. Barre de lecture et en-tête compact
const header = document.querySelector<HTMLElement>(".header");
const bar = document.createElement("span");
bar.className = "read-bar";
bar.setAttribute("aria-hidden", "true");
header?.appendChild(bar);
const updatePage = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = window.scrollY;
  bar.style.transform = `scaleX(${max > 0 ? clamp(y / max).toFixed(4) : 0})`;
  header?.classList.toggle("is-scrolled", y > 12);
};

let ticking = false;
const frame = () => {
  ticking = false;
  updatePage();
  active.forEach((s) => s.update());
};
const request = () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(frame);
  }
};
const measureAll = () => {
  scrubbers.forEach((s) => s.measure?.());
  request();
};

if (hasIO) {
  const sio = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        const s = scrubbers.find((x) => x.el === e.target);
        if (!s) return;
        if (e.isIntersecting) active.add(s);
        else {
          s.update(); // dernière mise à jour pour figer l'état juste (tout rempli ou tout vide)
          active.delete(s);
        }
      }),
    { rootMargin: "20% 0px 20% 0px" }
  );
  scrubbers.forEach((s) => sio.observe(s.el));
} else {
  scrubbers.forEach((s) => active.add(s));
}

measureAll();
scrubbers.forEach((s) => s.update());
window.addEventListener("scroll", request, { passive: true });
let resizeTimer = 0;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(measureAll, 120);
});
window.addEventListener("load", measureAll);
document.fonts?.ready.then(measureAll);

/* ---------- 5. Carte de la zone : trajets, points qui circulent, pulsations ---------- */
const SVGNS = "http://www.w3.org/2000/svg";
const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 7);

document.querySelectorAll<HTMLElement>(".zone").forEach((zone, zi) => {
  const svg = zone.querySelector<SVGSVGElement>(".zone__map svg");
  if (!svg) return;
  const pinGroup = svg.querySelector(":scope > g");
  const home = svg.querySelector<SVGGElement>(":scope > g:last-child");
  const homeDot = home?.querySelectorAll("circle")[1];
  if (!pinGroup || !home || !homeDot) return;
  const hx = Number(homeDot.getAttribute("cx"));
  const hy = Number(homeDot.getAttribute("cy"));
  const pins = Array.from(pinGroup.querySelectorAll<SVGGElement>(":scope > g"));

  const layer = svgEl("g", { class: "map-fx", "aria-hidden": "true" });
  pinGroup.parentNode!.insertBefore(layer, pinGroup);

  // Le Tarn qui s'écoule
  const river = svg.querySelector<SVGPathElement>(":scope > path");
  if (river && !reduced) {
    const flow = svgEl("path", { d: river.getAttribute("d") || "", class: "map-river", fill: "none" });
    flow.appendChild(svgEl("animate", { attributeName: "stroke-dashoffset", from: 0, to: -48, dur: "2.4s", repeatCount: "indefinite" }));
    layer.appendChild(flow);
  }

  // Ondes autour de Corbarieu
  if (!reduced) {
    [0, 1.3].forEach((begin) => {
      const ring = svgEl("circle", { cx: hx, cy: hy, r: 9, class: "map-ripple" });
      ring.appendChild(svgEl("animate", { attributeName: "r", values: "9;46", dur: "2.6s", begin: `${begin}s`, repeatCount: "indefinite" }));
      ring.appendChild(svgEl("animate", { attributeName: "opacity", values: "0.45;0", dur: "2.6s", begin: `${begin}s`, repeatCount: "indefinite" }));
      layer.appendChild(ring);
    });
  }

  type Stop = { name: string; route: SVGPathElement; pin: SVGGElement };
  const stops: Stop[] = [];
  pins.forEach((pin, i) => {
    const c = pin.querySelector("circle");
    if (!c) return;
    const x = Number(c.getAttribute("cx"));
    const y = Number(c.getAttribute("cy"));
    // Trajet légèrement courbé depuis Corbarieu
    const mx = (hx + x) / 2;
    const my = (hy + y) / 2;
    const dx = x - hx;
    const dy = y - hy;
    const cx = mx - dy * 0.18;
    const cy = my + dx * 0.18;
    const id = `route-${zi}-${i}`;
    const route = svgEl("path", { id, d: `M${hx} ${hy} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x} ${y}`, class: "map-route", pathLength: 1, fill: "none" });
    route.style.setProperty("--i", String(i));
    layer.appendChild(route);

    if (!reduced) {
      // Petit point qui fait l'aller vers la commune
      const dur = 2.6 + (i % 3) * 0.5;
      const dot = svgEl("circle", { r: 3, class: "map-traveler" });
      const motion = svgEl("animateMotion", { dur: `${dur}s`, begin: `${0.6 + i * 0.35}s`, repeatCount: "indefinite", keyPoints: "0;1", keyTimes: "0;1", calcMode: "spline", keySplines: "0.45 0 0.25 1" });
      motion.appendChild(svgEl("mpath", { href: `#${id}` }));
      dot.appendChild(motion);
      dot.appendChild(svgEl("animate", { attributeName: "opacity", values: "0;1;1;0", keyTimes: "0;0.12;0.8;1", dur: `${dur}s`, begin: `${0.6 + i * 0.35}s`, repeatCount: "indefinite" }));
      dot.setAttribute("opacity", "0");
      layer.appendChild(dot);

      // Pulsation de chaque commune
      const halo = svgEl("circle", { cx: x, cy: y, r: 5, class: "map-halo" });
      halo.appendChild(svgEl("animate", { attributeName: "r", values: "5;15", dur: "2.4s", begin: `${i * 0.34}s`, repeatCount: "indefinite" }));
      halo.appendChild(svgEl("animate", { attributeName: "opacity", values: "0.5;0", dur: "2.4s", begin: `${i * 0.34}s`, repeatCount: "indefinite" }));
      pin.insertBefore(halo, pin.firstChild);
    }
    pin.classList.add("map-pin");
    stops.push({ name: norm(pin.textContent || ""), route, pin });
  });

  // Interactivité : toucher une commune (sur la carte ou dans la liste) la met en avant
  const chips = Array.from(zone.querySelectorAll<HTMLElement>(".communes li"));
  let auto = 0;
  let userTouched = false;
  const setActive = (name: string | null) => {
    stops.forEach((s) => {
      const on = s.name === name;
      s.route.classList.toggle("is-active", on);
      s.pin.classList.toggle("is-active", on);
    });
    chips.forEach((c) => c.classList.toggle("is-active", !!name && norm(c.textContent || "") === name && !c.classList.contains("is-main")));
  };
  const userPick = (name: string | null) => {
    userTouched = true;
    window.clearInterval(auto);
    setActive(name);
  };
  stops.forEach((s) => {
    s.pin.addEventListener("pointerenter", () => userPick(s.name));
    s.pin.addEventListener("click", () => userPick(s.name));
  });
  chips.forEach((c) => {
    if (c.classList.contains("is-main")) return;
    const name = norm(c.textContent || "");
    c.addEventListener("pointerenter", () => userPick(name));
    c.addEventListener("click", () => userPick(name));
  });
  zone.querySelector(".zone__map")?.addEventListener("pointerleave", () => userTouched && setActive(null));

  // Visite guidée automatique tant que la carte est à l'écran et qu'on n'y a pas touché
  let step = 0;
  const startTour = () => {
    if (reduced || userTouched || auto) return;
    auto = window.setInterval(() => {
      setActive(stops[step % stops.length].name);
      step++;
    }, 1700);
  };
  const stopTour = () => {
    window.clearInterval(auto);
    auto = 0;
  };

  // Les animations SVG ne tournent que lorsque la carte est visible (batterie)
  if (hasIO) {
    new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          svg.unpauseAnimations?.();
          startTour();
        } else {
          svg.pauseAnimations?.();
          stopTour();
        }
      },
      { threshold: 0.15 }
    ).observe(svg);
  }
});
