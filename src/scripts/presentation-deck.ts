(function () {
  const deck = document.getElementById("slide-deck");
  const stage = document.getElementById("slide-stage");
  if (!deck || !stage) return;

  const slides = Array.from(stage.querySelectorAll<HTMLElement>("[data-slide]"));
  const total = slides.length;
  const counter = document.getElementById("slide-counter");
  const prevBtn = document.getElementById("slide-prev") as HTMLButtonElement | null;
  const nextBtn = document.getElementById("slide-next") as HTMLButtonElement | null;
  const dots = Array.from(document.querySelectorAll<HTMLButtonElement>(".deck__dot"));
  const fsBtn = document.getElementById("slide-fullscreen");
  const exportToggle = document.getElementById("slide-export-toggle");
  const exportMenu = document.getElementById("slide-export-menu");
  const shareBtn = document.getElementById("slide-share");
  const copyBtn = document.getElementById("slide-copy-link");
  const printBtn = document.getElementById("slide-print");
  const toast = document.getElementById("slide-toast");

  let current = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  function presentationUrl() {
    const url = new URL("/presentation", window.location.origin);
    url.hash = `#slide-${current + 1}`;
    return url.href;
  }

  function showToast(message: string) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => {
        toast.hidden = true;
      }, 200);
    }, 2600);
  }

  function setExportMenuOpen(open: boolean) {
    if (!exportToggle || !exportMenu) return;
    exportToggle.setAttribute("aria-expanded", open ? "true" : "false");
    exportMenu.hidden = !open;
  }

  async function copyPresentationLink() {
    const url = presentationUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast("Lien copié dans le presse-papiers");
    } catch {
      showToast(url);
    }
  }

  async function sharePresentation() {
    const url = presentationUrl();
    const shareData = {
      title: "Le Sourire de JoJo — Présentation",
      text: "Découvrez la présentation du projet Le Sourire de JoJo (10 slides).",
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setExportMenuOpen(false);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await copyPresentationLink();
  }

  function printPresentation() {
    setExportMenuOpen(false);
    window.print();
  }

  function parseHash(): number {
    const m = window.location.hash.match(/^#slide-(\d+)$/);
    if (!m) return 0;
    const n = parseInt(m[1]!, 10) - 1;
    return Number.isFinite(n) ? Math.max(0, Math.min(n, total - 1)) : 0;
  }

  function updateUI() {
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });

    dots.forEach((dot, i) => {
      const active = i === current;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (counter) counter.textContent = `${current + 1} / ${total}`;
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === total - 1;

    history.replaceState(null, "", `#slide-${current + 1}`);
  }

  function goTo(index: number) {
    const next = Math.max(0, Math.min(index, total - 1));
    if (next === current) return;

    const leaving = slides[current];
    leaving?.classList.add("is-leaving");
    window.setTimeout(() => leaving?.classList.remove("is-leaving"), 380);

    current = next;
    updateUI();
  }

  prevBtn?.addEventListener("click", () => goTo(current - 1));
  nextBtn?.addEventListener("click", () => goTo(current + 1));

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const idx = parseInt(dot.dataset.goto ?? "0", 10);
      goTo(idx);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      goTo(current - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(total - 1);
    } else if (e.key === "Escape") {
      if (exportMenu && !exportMenu.hidden) {
        setExportMenuOpen(false);
        exportToggle?.focus();
      } else {
        window.location.href = "/";
      }
    }
  });

  stage.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      if (!t) return;
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    },
    { passive: true },
  );

  stage.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) goTo(current + 1);
      else goTo(current - 1);
    },
    { passive: true },
  );

  fsBtn?.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await deck.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  });

  exportToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = exportToggle.getAttribute("aria-expanded") !== "true";
    setExportMenuOpen(open);
  });

  shareBtn?.addEventListener("click", () => {
    void sharePresentation();
  });

  copyBtn?.addEventListener("click", () => {
    setExportMenuOpen(false);
    void copyPresentationLink();
  });

  printBtn?.addEventListener("click", printPresentation);

  document.addEventListener("click", (e) => {
    if (!exportMenu || exportMenu.hidden) return;
    const target = e.target as Node | null;
    if (target && (exportMenu.contains(target) || exportToggle?.contains(target))) return;
    setExportMenuOpen(false);
  });

  exportMenu?.querySelectorAll(".deck__export-item").forEach((item) => {
    item.addEventListener("click", () => setExportMenuOpen(false));
  });

  window.addEventListener("hashchange", () => {
    goTo(parseHash());
  });

  current = parseHash();
  updateUI();
})();
