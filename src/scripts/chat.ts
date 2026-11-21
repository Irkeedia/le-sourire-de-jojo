// Jojo, l'assistant du site — moteur de compréhension et interface (sans IA).
// Chargé à la demande (premier toucher du bouton). Tout le texte affiché vient de
// src/lib/chat-knowledge.ts ; ce que tape la personne n'est jamais injecté en HTML.

import {
  AU_REVOIR,
  BONJOUR,
  COMMUNES,
  INTENTS,
  INTENT_BY_ID,
  MERCI,
  PAGE_HINTS,
  PHONE,
  URGENCE,
  priceFor,
  type Answer,
  type ChatAction,
  type Mood,
} from "@/lib/chat-knowledge";

/* ===================================================================== */
/* 1. Compréhension du texte                                              */
/* ===================================================================== */

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const STOP = new Set(
  "le la les l de du des d un une et ou a au aux en pour par sur avec est ce c que qu qui quoi je j vous tu il elle on ma mon mes ta ton votre vos nos notre ne n pas y se s si me m te t bien tres plus moins cela ca cette cet ces sont suis etes avez ai as a peut puis pouvez faut fait faire dans chez comme mais donc alors aussi tout tous toute toutes faites fais quoi".split(" ")
);

const stem = (w: string) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w);

function lev(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const tokenMatch = (tok: string, key: string) => {
  const t = stem(tok);
  const k = stem(key);
  if (t === k) return true;
  if (k.length >= 4 && t.startsWith(k)) return true;
  // Fautes de frappe : 1 lettre d'écart (2 pour les mots très longs)
  const tol = k.length >= 10 ? 2 : 1;
  if (k.length >= 5 && lev(t, k, tol) <= tol) return true;
  return false;
};

type Parsed = { raw: string; text: string; padded: string; tokens: string[] };
const parse = (raw: string): Parsed => {
  const text = norm(raw);
  return { raw, text, padded: ` ${text} `, tokens: text.split(" ").filter((w) => w && !STOP.has(w)) };
};

const has = (p: Parsed, re: RegExp) => re.test(p.text);

function scoreIntents(p: Parsed) {
  return INTENTS.map((intent) => {
    let score = 0;
    for (const rawKey of intent.keys) {
      const strong = rawKey.startsWith("!");
      const key = strong ? rawKey.slice(1) : rawKey;
      let hit = false;
      if (key.includes(" ")) hit = p.padded.includes(` ${key} `);
      else hit = p.tokens.some((t) => tokenMatch(t, key));
      if (hit) score += strong ? 3 : key.includes(" ") ? 2 : 1;
    }
    return { intent, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

const NUMBERS: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, douze: 12, quinze: 15, vingt: 20 };
function findHours(p: Parsed): { hours: number; per: "seance" | "semaine" | "mois" } | null {
  const m = p.text.match(/\b(\d{1,2}(?:[ ,.]5)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze|quinze|vingt)\s*(h|heure|heures)\b/);
  if (!m) return null;
  const n = NUMBERS[m[1]] ?? parseFloat(m[1].replace(/[ ,]/, "."));
  if (!n || n > 60) return null;
  const per = /semaine|hebdo/.test(p.text) ? "semaine" : /mois|mensuel/.test(p.text) ? "mois" : "seance";
  return { hours: n, per };
}

const ZONE_TOWNS = COMMUNES.map((c) => ({ name: c, key: norm(c).replace(/^saint /, "st ") }));
const OTHER_TOWNS = [
  "lamothe capdeville", "albias", "montbeton", "villeneuve les bouloc", "toulouse", "castelsarrasin", "moissac", "caussade",
  "negrepelisse", "grisolles", "nohic", "fronton", "villebrumier", "bouloc", "finhan", "montech", "lafrancaise",
  "saint etienne de tulmont", "verlhac tescou", "genebrieres", "la ville dieu du temple", "bressols", "pompignan", "canals", "dieupentale",
];
function findTown(p: Parsed): { name: string; inZone: boolean } | null {
  const t = ` ${p.text.replace(/\bst\b/g, "saint")} `;
  for (const z of ZONE_TOWNS) {
    const k = norm(z.name);
    if (t.includes(` ${k} `) || (k.split(" ")[0].length > 5 && t.includes(` ${k.split(" ")[0]} `))) return { name: z.name, inZone: true };
  }
  for (const o of OTHER_TOWNS) if (t.includes(` ${o} `)) return { name: o.replace(/\b\w/g, (c) => c.toUpperCase()), inZone: false };
  return null;
}

/* ===================================================================== */
/* 2. État de la conversation (gardé le temps de la visite)               */
/* ===================================================================== */

type Msg =
  | { from: "user"; text: string }
  | { from: "bot"; answer: Answer; kind?: "summary" | "done" };

type BookingData = {
  mode: "booking" | "question";
  relation?: string;
  audience?: string;
  commune?: string;
  communeAutre?: string;
  creneau?: string;
  jours?: string[];
  horizon?: string;
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  question?: string;
  /** Vrai si la question reste à saisir (parcours « question » sans question préalable) */
  askQuestion?: boolean;
  consents?: boolean;
};

type State = { msgs: Msg[]; flow: null | { step: number; editing: boolean; data: BookingData } };

const STORE = "jojo-chat-v1";
/** Dernière question non comprise, transmise telle quelle à Céline si on le souhaite */
let lastQuestion = "";
const load = (): State => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORE) || "null");
    if (s && Array.isArray(s.msgs)) return s;
  } catch {}
  return { msgs: [], flow: null };
};
let state: State = load();
const save = () => {
  try {
    state.msgs = state.msgs.slice(-60);
    sessionStorage.setItem(STORE, JSON.stringify(state));
  } catch {}
};

/* ===================================================================== */
/* 3. Parcours « demande de visite » dans le chat                         */
/* ===================================================================== */

type Choice = { v: string; l: string };
type Step = {
  key: keyof BookingData;
  ask: (d: BookingData) => string;
  modes?: BookingData["mode"][];
  choices?: Choice[];
  multi?: string[];
  input?: { type: string; inputmode?: string; autocomplete?: string; placeholder: string };
  validate?: (v: string, d: BookingData) => string | null;
  skip?: (d: BookingData) => string | null;
  when?: (d: BookingData) => boolean;
  consent?: boolean;
  label?: string;
  show?: (d: BookingData) => string;
};

const LABELS: Record<string, string> = {
  personne_concernee: "Pour moi",
  proche_famille: "Pour un proche",
  professionnel: "Je suis un professionnel",
  senior_autonome: "Senior autonome",
  convalescence: "Convalescence, retour à domicile",
  parent_solo: "Parent solo (enfant de plus de 3 ans)",
  autre_situation: "Autre situation",
  matin: "Plutôt le matin",
  apres_midi: "Plutôt l’après-midi",
  flexible: "Peu importe",
  semaine_courante: "Cette semaine",
  deux_semaines: "Dans les deux semaines",
  souple: "Pas de date fixe",
};
const choices = (...ids: string[]): Choice[] => ids.map((v) => ({ v, l: LABELS[v] }));
const AUTRE = "__autre__";

const STEPS: Step[] = [
  { key: "relation", modes: ["booking"], label: "Pour", ask: () => "C’est pour vous, ou pour un proche ?", choices: choices("personne_concernee", "proche_famille", "professionnel"), show: (d) => LABELS[d.relation || ""] },
  { key: "audience", modes: ["booking"], label: "Situation", ask: (d) => (d.relation === "proche_famille" ? "Quelle situation correspond le mieux à votre proche ?" : "Quelle situation correspond le mieux ?"), choices: choices("senior_autonome", "convalescence", "parent_solo", "autre_situation"), show: (d) => LABELS[d.audience || ""] },
  { key: "commune", modes: ["booking"], label: "Commune", ask: () => "Dans quelle commune ?", choices: [...COMMUNES.map((c) => ({ v: c, l: c })), { v: AUTRE, l: "Autre commune" }], show: (d) => communeOf(d) },
  { key: "communeAutre", modes: ["booking"], when: (d) => d.commune === AUTRE, ask: () => "Laquelle ? (Au-delà de la zone, les frais de trajet suivent le barème kilométrique, au cas par cas.)", input: { type: "text", autocomplete: "address-level2", placeholder: "Nom de la commune" }, validate: (v) => (v.trim().length < 2 ? "Indiquez le nom de la commune." : null) },
  { key: "creneau", modes: ["booking"], label: "Moment", ask: () => "Quel moment de la journée vous arrange ?", choices: choices("matin", "apres_midi", "flexible"), show: (d) => LABELS[d.creneau || ""] },
  { key: "jours", modes: ["booking"], label: "Jours", ask: () => "Des jours préférés ? Plusieurs choix possibles.", multi: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"], skip: () => "Pas de préférence", show: (d) => (d.jours?.length ? d.jours.join(", ") : "Pas de préférence") },
  { key: "horizon", modes: ["booking"], label: "Quand", ask: () => "Et pour quand ?", choices: choices("semaine_courante", "deux_semaines", "souple"), show: (d) => LABELS[d.horizon || ""] },
  { key: "question", modes: ["question"], when: (d) => d.askQuestion === true, label: "Question", ask: () => "Quelle est votre question ? Je la transmets telle quelle à Céline.", input: { type: "text", autocomplete: "off", placeholder: "Votre question" }, validate: (v) => (v.trim().length < 3 ? "Écrivez votre question en quelques mots." : null), show: (d) => d.question || "" },
  { key: "name", label: "Nom", ask: (d) => (d.mode === "question" ? "Je transmets votre question à Céline. À quel nom ?" : "Parfait. Votre prénom et votre nom ?"), input: { type: "text", autocomplete: "name", placeholder: "Prénom Nom" }, validate: (v) => (v.trim().length < 2 ? "Indiquez votre prénom et votre nom." : null), show: (d) => d.name || "" },
  { key: "phone", label: "Téléphone", ask: (d) => `Merci ${firstName(d)} ! Votre numéro, pour que Céline vous rappelle ?`, input: { type: "tel", inputmode: "tel", autocomplete: "tel", placeholder: "06 12 34 56 78" }, validate: (v) => (v.replace(/\D/g, "").length < 9 ? "Ce numéro semble incomplet." : null), skip: () => "Je préfère l’e-mail", show: (d) => d.phone || "—" },
  { key: "email", label: "E-mail", ask: (d) => (d.phone ? "Et votre e-mail ? C’est facultatif." : "Votre adresse e-mail ?"), input: { type: "email", inputmode: "email", autocomplete: "email", placeholder: "prenom@exemple.fr" }, validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : "Cette adresse e-mail ne semble pas valide."), skip: (d) => (d.phone ? "Passer" : null), show: (d) => d.email || "—" },
  { key: "message", modes: ["booking"], label: "Message", ask: () => "Un mot pour Céline ? Vos attentes, vos envies… C’est facultatif.", input: { type: "text", autocomplete: "off", placeholder: "Votre message" }, skip: () => "Rien à ajouter", show: (d) => d.message || "—" },
  { key: "consents", consent: true, ask: () => "Dernière étape : deux confirmations, puis je vous montre le récapitulatif." },
];

const communeOf = (d: BookingData) => (d.commune === AUTRE ? d.communeAutre || "Autre commune" : d.commune || "");
const firstName = (d: BookingData) => (d.name || "").trim().split(/\s+/)[0] || "";
const activeSteps = (d: BookingData) => STEPS.filter((s) => (!s.modes || s.modes.includes(d.mode)) && (!s.when || s.when(d)));

/* ===================================================================== */
/* 4. Interface                                                           */
/* ===================================================================== */

const root = document.querySelector<HTMLElement>("[data-jojo]")!;
const panel = root.querySelector<HTMLElement>("[data-jojo-panel]")!;
const sheet = root.querySelector<HTMLElement>("[data-jojo-sheet]")!;
const msgsEl = root.querySelector<HTMLElement>("[data-jojo-msgs]")!;
const chipsEl = root.querySelector<HTMLElement>("[data-jojo-chips]")!;
const form = root.querySelector<HTMLFormElement>("[data-jojo-form]")!;
const input = root.querySelector<HTMLInputElement>("[data-jojo-input]")!;
const inputLabel = root.querySelector<HTMLElement>("[data-jojo-label]")!;
const launcher = root.querySelector<HTMLButtonElement>(".jojo__launcher")!;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isPhone = () => window.matchMedia("(max-width: 640px)").matches;

const MOOD_IMG: Record<Mood, string> = {
  bonjour: "/images/mascotte/bonjour.webp",
  reflechit: "/images/mascotte/reflechit.webp",
  agenda: "/images/mascotte/agenda.webp",
  joie: "/images/mascotte/joie.webp",
  guide: "/images/mascotte/guide.webp",
  oups: "/images/mascotte/oups.webp",
  telephone: "/images/mascotte/telephone.webp",
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

const scrollDown = (smooth = true) => {
  requestAnimationFrame(() => msgsEl.scrollTo({ top: msgsEl.scrollHeight, behavior: smooth && !reduced ? "smooth" : "auto" }));
};

function renderWelcome() {
  const hint = PAGE_HINTS[location.pathname.replace(/\/$/, "") || "/"] ?? PAGE_HINTS["/"];
  const card = el("div", "jojo-welcome");
  const img = el("img", "jojo-welcome__img");
  img.src = MOOD_IMG.bonjour;
  img.alt = "";
  img.width = 120;
  img.height = 120;
  card.append(img, el("p", "jojo-welcome__title", "Bonjour, moi c’est Jojo !"), el("p", "jojo-welcome__text", hint.text));
  const grid = el("div", "jojo-welcome__grid");
  hint.next.slice(0, 6).forEach((id) => {
    const intent = INTENT_BY_ID[id];
    if (!intent) return;
    const b = el("button", "jojo-welcome__btn", intent.chip);
    b.type = "button";
    b.addEventListener("click", () => ask(intent.chip, () => (id === "rdv" ? startFlow("booking") : reply(intent.answer))));
    grid.appendChild(b);
  });
  card.appendChild(grid);
  msgsEl.appendChild(card);
}

function renderUser(text: string) {
  const row = el("div", "jojo-row jojo-row--user");
  row.appendChild(el("p", "jojo-bubble jojo-bubble--user", text));
  msgsEl.appendChild(row);
}

function renderAnswer(a: Answer, kind?: "summary" | "done") {
  const row = el("div", "jojo-row jojo-row--bot");
  if (a.mood && a.mood !== "bonjour") {
    const img = el("img", "jojo-mood");
    img.src = MOOD_IMG[a.mood];
    img.alt = "";
    img.width = 84;
    img.height = 84;
    row.appendChild(img);
  }
  const bubble = el("div", `jojo-bubble jojo-bubble--bot${kind ? ` jojo-bubble--${kind}` : ""}`);
  a.text.forEach((t) => bubble.appendChild(el("p", undefined, t)));
  if (a.list?.length) {
    const ul = el("ul", "jojo-list");
    a.list.forEach((li) => ul.appendChild(el("li", undefined, li)));
    bubble.appendChild(ul);
  }
  if (a.prices?.length) {
    const box = el("div", "jojo-prices");
    a.prices.forEach((p) => {
      const line = el("div", "jojo-price");
      line.appendChild(el("span", "jojo-price__label", p.label));
      const main = el("span", "jojo-price__main");
      main.append(el("strong", "jojo-price__ttc", `${p.ttc} €`), el("span", "jojo-price__unit", p.unit));
      line.appendChild(main);
      if (p.net != null) line.appendChild(el("span", "jojo-price__net", `Soit ${p.net} € ${p.netUnit ?? ""}`.trim()));
      box.appendChild(line);
    });
    bubble.appendChild(box);
  }
  if (a.note) bubble.appendChild(el("p", "jojo-note", a.note));
  if (a.actions?.length) {
    const acts = el("div", "jojo-actions");
    a.actions.forEach((act) => acts.appendChild(actionButton(act)));
    bubble.appendChild(acts);
  }
  row.appendChild(bubble);
  msgsEl.appendChild(row);
}

function actionButton(act: ChatAction) {
  const cls = `jojo-action${act.primary ? " jojo-action--primary" : ""}`;
  if (act.href) {
    const a = el("a", cls, act.label);
    a.href = act.href;
    if (!act.href.startsWith("tel:")) {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        goTo(act.href!);
      });
    }
    return a;
  }
  const b = el("button", cls, act.label);
  b.type = "button";
  b.addEventListener("click", () => {
    if (act.flow) ask(act.label, () => startFlow(act.flow!, act.flow === "question" ? lastQuestion || undefined : undefined));
    else if (act.intent && INTENT_BY_ID[act.intent]) ask(act.label, () => reply(INTENT_BY_ID[act.intent!].answer));
  });
  return b;
}

/** Aller vers une page ou une section, et la mettre en valeur à l'arrivée */
function goTo(href: string) {
  const url = new URL(href, location.href);
  const samePage = url.pathname === location.pathname && url.search === location.search;
  if (samePage && url.hash) {
    if (isPhone()) close();
    spotlight(url.hash);
    return;
  }
  try {
    if (url.hash) sessionStorage.setItem("jojo-spot", url.hash);
    sessionStorage.setItem("jojo-arrived", "1");
  } catch {}
  close(true);
  location.href = url.pathname + url.search + url.hash;
}

export function spotlight(hash: string) {
  const target = document.querySelector<HTMLElement>(hash);
  if (!target) return;
  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  target.classList.remove("jojo-spot");
  void target.offsetWidth;
  target.classList.add("jojo-spot");
  window.setTimeout(() => target.classList.remove("jojo-spot"), 2600);
}

function renderChips(items: { label: string; onPick: () => void; ghost?: boolean }[]) {
  chipsEl.replaceChildren();
  items.forEach((it) => {
    const b = el("button", `jojo-chip${it.ghost ? " jojo-chip--ghost" : ""}`, it.label);
    b.type = "button";
    b.addEventListener("click", it.onPick);
    chipsEl.appendChild(b);
  });
  chipsEl.hidden = items.length === 0;
  chipsEl.scrollLeft = 0;
}

function intentChips(ids: string[] = []) {
  const list = [...new Set(ids)].map((id) => INTENT_BY_ID[id]).filter(Boolean);
  renderChips(
    list.slice(0, 5).map((intent) => ({
      label: intent.chip,
      onPick: () => ask(intent.chip, () => (intent.id === "rdv" ? startFlow("booking") : reply(intent.answer))),
    }))
  );
}

function setComposer(opts?: Step["input"]) {
  input.type = opts?.type ?? "text";
  input.setAttribute("inputmode", opts?.inputmode ?? "text");
  input.setAttribute("autocomplete", opts?.autocomplete ?? "off");
  input.placeholder = opts?.placeholder ?? "Écrivez votre question…";
  inputLabel.textContent = opts?.placeholder ?? "Votre message";
  input.value = "";
}

/* ---------- Bulle « Jojo écrit… » et envoi d'une réponse ---------- */
let typingTimer = 0;
function typing(on: boolean) {
  msgsEl.querySelector(".jojo-typing")?.remove();
  if (on) {
    const row = el("div", "jojo-row jojo-row--bot jojo-typing");
    const b = el("div", "jojo-bubble jojo-bubble--bot");
    b.setAttribute("aria-label", "Jojo écrit");
    b.append(el("i"), el("i"), el("i"));
    row.appendChild(b);
    msgsEl.appendChild(row);
    scrollDown();
  }
}

function reply(a: Answer, kind?: "summary" | "done", after?: () => void) {
  window.clearTimeout(typingTimer);
  typing(true);
  const words = a.text.join(" ").length + (a.list?.join(" ").length ?? 0) * 0.3;
  const delay = reduced ? 120 : Math.min(1100, 380 + words * 3);
  typingTimer = window.setTimeout(() => {
    typing(false);
    state.msgs.push({ from: "bot", answer: a, kind });
    save();
    renderAnswer(a, kind);
    if (after) after();
    else if (!state.flow) intentChips(a.next ?? ["rdv", "tarifs", "activites"]);
    scrollDown();
  }, delay);
}

/** La personne choisit ou écrit quelque chose : on l'affiche, puis on agit */
function ask(label: string, then: () => void) {
  state.msgs.push({ from: "user", text: label });
  save();
  renderUser(label);
  chipsEl.replaceChildren();
  scrollDown();
  then();
}

/* ---------- Le parcours ---------- */
function startFlow(mode: BookingData["mode"], question?: string) {
  state.flow = { step: 0, editing: false, data: { mode, question, askQuestion: mode === "question" && !question } };
  save();
  if (mode === "booking") {
    reply({ text: ["Avec plaisir ! Quelques questions rapides, et Céline vous rappelle pour fixer le jour de la visite d’évaluation offerte."], mood: "agenda" }, undefined, () => askStep());
  } else {
    askStep();
  }
}

function currentStep(): Step | null {
  if (!state.flow) return null;
  return activeSteps(state.flow.data)[state.flow.step] ?? null;
}

function askStep() {
  const f = state.flow;
  if (!f) return;
  const step = currentStep();
  if (!step) return showSummary();
  reply({ text: [step.ask(f.data)] }, undefined, () => {
    setComposer(step.input);
    if (step.consent) return renderConsents();
    if (step.choices) {
      renderChips(step.choices.map((c) => ({ label: c.l, onPick: () => answerStep(c.v, c.l) })));
    } else if (step.multi) {
      renderMulti(step);
    } else {
      const skip = step.skip?.(f.data);
      renderChips(skip ? [{ label: skip, ghost: true, onPick: () => answerStep("", skip) }] : []);
      if (!isPhone()) input.focus();
    }
    addCancelChip();
  });
}

function addCancelChip() {
  const b = el("button", "jojo-chip jojo-chip--cancel", "Annuler la demande");
  b.type = "button";
  b.addEventListener("click", () => ask("Annuler la demande", cancelFlow));
  chipsEl.appendChild(b);
  chipsEl.hidden = false;
}

function cancelFlow() {
  state.flow = null;
  save();
  setComposer();
  reply({ text: ["C’est noté, j’annule. Je reste là si vous avez une question !"], next: ["tarifs", "activites", "contact"] });
}

function renderMulti(step: Step) {
  const picked = new Set<string>();
  chipsEl.replaceChildren();
  step.multi!.forEach((d) => {
    const b = el("button", "jojo-chip", d);
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      picked.has(d) ? picked.delete(d) : picked.add(d);
      b.setAttribute("aria-pressed", String(picked.has(d)));
      ok.textContent = picked.size ? `Valider (${picked.size})` : step.skip!(state.flow!.data)!;
    });
    chipsEl.appendChild(b);
  });
  const ok = el("button", "jojo-chip jojo-chip--ok", step.skip!(state.flow!.data)!);
  ok.type = "button";
  ok.addEventListener("click", () => {
    const days = step.multi!.filter((d) => picked.has(d));
    answerStep(days, days.length ? days.join(", ") : "Pas de préférence");
  });
  chipsEl.appendChild(ok);
  chipsEl.hidden = false;
}

function renderConsents() {
  const box = el("div", "jojo-consents");
  const mk = (text: string, small: string) => {
    const lab = el("label", "jojo-consent");
    const cb = el("input");
    cb.type = "checkbox";
    const span = el("span", undefined, text);
    span.appendChild(el("small", undefined, ` ${small}`));
    lab.append(cb, span);
    box.appendChild(lab);
    return cb;
  };
  const c1 = mk("Je peux signer un contrat (pleine capacité juridique) ou j’agis comme représentant légal.", "Art. 1145 C. civ.");
  const c2 = mk("En cas d’urgence vitale, j’appelle d’abord les secours (15, 18, 112 ou 114).", "Art. 223-6 C. pén.");
  const btn = el("button", "jojo-action jojo-action--primary", "Je confirme");
  btn.type = "button";
  btn.disabled = true;
  const sync = () => (btn.disabled = !(c1.checked && c2.checked));
  c1.addEventListener("change", sync);
  c2.addEventListener("change", sync);
  btn.addEventListener("click", () => {
    box.classList.add("is-done");
    c1.disabled = c2.disabled = btn.disabled = true;
    answerStep(true, "Je confirme les deux points");
  });
  box.appendChild(btn);
  const row = el("div", "jojo-row jojo-row--bot");
  row.appendChild(box);
  msgsEl.appendChild(row);
  chipsEl.replaceChildren();
  addCancelChip();
  scrollDown();
}

function answerStep(value: string | string[] | boolean, label: string) {
  const f = state.flow;
  const step = currentStep();
  if (!f || !step) return;
  if (typeof value === "string" && step.validate && value !== "") {
    const err = step.validate(value, f.data);
    if (err) {
      ask(label, () => reply({ text: [err], mood: "oups" }, undefined, () => askStepInputOnly(step)));
      return;
    }
  }
  ask(label, () => {
    (f.data as Record<string, unknown>)[step.key] = typeof value === "string" ? value.trim() : value;
    if (f.editing) {
      f.editing = false;
      // Une commune « Autre » demande encore son nom
      if (step.key === "commune" && value === AUTRE) {
        f.step = activeSteps(f.data).findIndex((s) => s.key === "communeAutre");
        save();
        return askStep();
      }
      f.step = activeSteps(f.data).length;
      save();
      return showSummary();
    }
    f.step += 1;
    save();
    askStep();
  });
}

function askStepInputOnly(step: Step) {
  setComposer(step.input);
  const skip = step.skip?.(state.flow!.data);
  renderChips(skip ? [{ label: skip, ghost: true, onPick: () => answerStep("", skip) }] : []);
  addCancelChip();
  if (!isPhone()) input.focus();
}

function showSummary() {
  const f = state.flow!;
  const d = f.data;
  setComposer();
  const lines = activeSteps(d).filter((s) => s.show && s.label);
  const a: Answer = {
    text: [d.mode === "question" ? "Voici ce que je vais transmettre à Céline :" : "Voici votre demande. Tout est bon ?"],
    mood: "agenda",
  };
  typing(true);
  window.setTimeout(() => {
    typing(false);
    const row = el("div", "jojo-row jojo-row--bot");
    const card = el("div", "jojo-bubble jojo-bubble--bot jojo-bubble--summary");
    card.appendChild(el("p", undefined, a.text[0]));
    const dl = el("dl", "jojo-summary");
    if (d.mode === "question" && d.question && !d.askQuestion) {
      dl.append(el("dt", undefined, "Question"), el("dd", undefined, d.question));
    }
    lines.forEach((s) => {
      const dt = el("dt", undefined, s.label!);
      const dd = el("dd");
      dd.appendChild(el("span", undefined, s.show!(d)));
      const edit = el("button", "jojo-edit", "Modifier");
      edit.type = "button";
      edit.setAttribute("aria-label", `Modifier : ${s.label}`);
      edit.addEventListener("click", () => {
        f.editing = true;
        f.step = activeSteps(d).indexOf(s);
        save();
        askStep();
      });
      dd.appendChild(edit);
      dl.append(dt, dd);
    });
    card.appendChild(dl);
    const send = el("button", "jojo-action jojo-action--primary jojo-send-request", d.mode === "question" ? "Envoyer ma question" : "Envoyer ma demande");
    send.type = "button";
    send.addEventListener("click", () => submit(send));
    card.appendChild(send);
    row.appendChild(card);
    msgsEl.appendChild(row);
    renderChips([]);
    addCancelChip();
    scrollDown();
  }, reduced ? 100 : 500);
}

const ZONE_IDS: Record<string, string> = {
  Corbarieu: "corbarieu",
  "Labastide-Saint-Pierre": "labastide_saint_pierre",
  Bressols: "bressols",
  Reyniès: "reynies",
  "Saint-Nauphary": "saint_nauphary",
  Orgueil: "orgueil",
  Campsas: "campsas",
};

async function submit(btn: HTMLButtonElement) {
  const d = state.flow!.data;
  btn.disabled = true;
  btn.textContent = "Envoi en cours…";
  const lines = [
    d.mode === "question" ? "Question posée à l’assistant du site :" : "Demande de visite faite avec l’assistant du site.",
    d.mode === "question" && d.question ? `« ${d.question} »` : null,
    d.jours?.length ? `Jours préférés : ${d.jours.join(", ")}` : null,
    d.message ? `Message : ${d.message}` : null,
  ].filter(Boolean);
  const payload = {
    name: d.name ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    audience: d.audience ?? "",
    relation: d.relation === "professionnel" ? "professionnel" : d.relation ?? "",
    zone: d.commune ? ZONE_IDS[d.commune] ?? "" : "",
    zone_detail: communeOf(d),
    creneau: d.creneau ?? "",
    horizon: d.horizon ?? "",
    pack: "",
    subject: d.mode === "question" ? "Question via l’assistant Jojo" : "Demande de visite d’évaluation (assistant Jojo)",
    message: lines.join("\n"),
    website: "",
    legal_capacity_status: d.consents === true,
    emergency_protocol_acknowledged: d.consents === true,
    medical_cert_date: "",
    deglutition_risk_alert: "",
  };
  try {
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      btn.disabled = false;
      btn.textContent = "Réessayer";
      const errs = data.errors ? Object.values(data.errors as Record<string, string[]>).flat() : [];
      reply({
        text: [errs[0] ?? data.error ?? "L’envoi n’a pas fonctionné.", `Vous pouvez corriger, réessayer, ou appeler Céline au ${PHONE.display}.`],
        actions: [{ label: `Appeler ${PHONE.display}`, href: `tel:${PHONE.e164}` }],
        mood: "oups",
      }, undefined, () => addCancelChip());
      return;
    }
    btn.textContent = "Envoyé";
    const name = firstName(d);
    state.flow = null;
    save();
    reply(
      {
        text: [
          `C’est envoyé${name ? `, merci ${name}` : ""} !`,
          d.mode === "question" ? "Céline vous répond au plus vite." : "Céline vous recontacte très vite pour fixer le jour de la visite d’évaluation offerte.",
        ],
        mood: "joie",
        next: ["deroule", "credit", "activites"],
      },
      "done"
    );
  } catch {
    btn.disabled = false;
    btn.textContent = "Réessayer";
    reply({ text: ["Pas de connexion pour le moment. Réessayez dans un instant, ou appelez Céline."], actions: [{ label: `Appeler ${PHONE.display}`, href: `tel:${PHONE.e164}` }], mood: "oups" }, undefined, () => addCancelChip());
  }
}

/* ---------- Réponse à un texte libre ---------- */
function understand(raw: string) {
  const p = parse(raw);
  const f = state.flow;

  if (has(p, /\b(urgence|urgent vital|secours|samu|pompier|pompiers|chute|tombe|tombee|malaise|inconscient|respire plus|avc|crise cardiaque)\b/)) return reply(URGENCE);

  // Pendant le parcours : on essaie d'abord de comprendre la réponse attendue
  if (f) {
    const step = currentStep();
    if (/^(annuler|stop|arreter|laisse tomber)\b/.test(p.text)) return cancelFlow();
    if (step?.choices) {
      const hit = step.choices.find((c) => {
        const l = norm(c.l);
        return p.text === l || l.includes(p.text) || p.text.includes(norm(c.v).replace(/_/g, " ")) || p.tokens.some((t) => t.length > 3 && l.split(" ").some((w) => tokenMatch(t, w)));
      });
      if (hit) {
        // La réponse est déjà affichée : on enregistre directement
        state.msgs.pop();
        msgsEl.lastElementChild?.remove();
        return answerStep(hit.v, hit.l);
      }
      if (step.key === "commune" && p.text.length > 1) {
        state.msgs.pop();
        msgsEl.lastElementChild?.remove();
        const town = findTown(p);
        return answerStep(town?.inZone ? town.name : raw.trim(), raw.trim());
      }
    } else if (step?.input || step?.multi) {
      if (step.multi) {
        const days = step.multi.filter((d) => p.tokens.some((t) => tokenMatch(t, norm(d))));
        state.msgs.pop();
        msgsEl.lastElementChild?.remove();
        return answerStep(days, days.length ? days.join(", ") : raw.trim());
      }
      state.msgs.pop();
      msgsEl.lastElementChild?.remove();
      return answerStep(raw.trim(), raw.trim());
    }
    // Une vraie question au milieu du parcours : on répond, puis on reprend
    const best = scoreIntents(p)[0];
    if (best && best.score >= 2) {
      return reply(best.intent.answer, undefined, () => reply({ text: ["Reprenons votre demande :"] }, undefined, () => askStep()));
    }
    return reply({ text: ["Je n’ai pas bien saisi. Choisissez une réponse ci-dessous, ou écrivez-la autrement."], mood: "oups" }, undefined, () => askStep());
  }

  const scored = scoreIntents(p);
  const hours = findHours(p);
  const priceWords = has(p, /\b(prix|tarif|tarifs|combien|cout|coute|coutent|budget|cher|payer|euros?)\b/);

  if (hours && (priceWords || scored[0]?.intent.id === "tarifs" || p.tokens.length <= 5)) return reply(priceFor(hours.hours, hours.per));

  const town = findTown(p);
  if (town && (scored[0]?.intent.id === "zone" || p.tokens.length <= 4 || has(p, /\b(venez|intervenez|deplacez|habite|zone|secteur|commune)\b/))) {
    return reply(
      town.inZone
        ? { text: [`Oui ! ${town.name} fait partie de la zone d’intervention : les déplacements sont compris dans le tarif.`], actions: [{ label: "Demander la visite offerte", flow: "booking", primary: true }], next: ["tarifs", "zone"], mood: "joie" }
        : { text: [`${town.name} n’est pas dans la zone habituelle (Corbarieu et ses alentours). Céline peut parfois venir : les frais de trajet suivent alors le barème kilométrique, au cas par cas.`], actions: [{ label: "Lui demander", flow: "booking", primary: true }, { label: "Voir la zone", href: "/a-propos#zone" }], mood: "reflechit" }
    );
  }

  if (!scored.length || scored[0].score < 1) {
    if (has(p, /^(bonjour|salut|coucou|hello|bonsoir|hey|yo)\b/)) return reply(BONJOUR);
    if (has(p, /\b(merci|super|top|parfait|genial|cool|ok merci|d accord)\b/)) return reply(MERCI);
    if (has(p, /\b(au revoir|bye|a bientot|bonne journee|bonne soiree)\b/)) return reply(AU_REVOIR);
    return fallback(raw, p);
  }

  // Une question de prix sur un sujet précis (forfait, crédit d'impôt, sorties…) : le sujet précis l'emporte
  if (scored[0].intent.id === "tarifs" && scored[1] && scored[1].score >= 3) [scored[0], scored[1]] = [scored[1], scored[0]];
  const [best, second] = scored;
  if (best.intent.id === "rdv" && best.score >= 3) return startFlow("booking");
  const answer: Answer = { ...best.intent.answer };
  if (second && second.score >= Math.max(2, best.score * 0.75) && second.intent.id !== best.intent.id) {
    answer.next = [second.intent.id, ...(answer.next ?? [])];
  }
  reply(answer);
}

function fallback(raw: string, p: Parsed) {
  // Suggestions : les sujets dont au moins un mot ressemble vaguement
  const loose = INTENTS.map((i) => ({ i, s: i.keys.filter((k) => p.tokens.some((t) => t.length > 3 && norm(k.replace("!", "")).startsWith(t.slice(0, 4)))).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.i.id);
  reply(
    {
      text: ["Je ne suis pas sûr d’avoir compris. Je peux transmettre votre question telle quelle à Céline, ou vous pouvez choisir un sujet :"],
      actions: [{ label: "Transmettre ma question à Céline", flow: "question", primary: true }],
      next: [...loose, "tarifs", "activites", "rdv"].slice(0, 5),
      mood: "oups",
    },
    undefined,
    () => {
      lastQuestion = raw;
      intentChips([...loose, "tarifs", "activites", "rdv"]);
    }
  );
}

/* ---------- Composer ---------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  state.msgs.push({ from: "user", text });
  save();
  renderUser(text);
  chipsEl.replaceChildren();
  scrollDown();
  understand(text);
});

/* ===================================================================== */
/* 5. Ouverture, fermeture, défilement verrouillé                         */
/* ===================================================================== */

let lockY = 0;
let locked = false;
function lockScroll() {
  if (locked || !isPhone()) return;
  locked = true;
  lockY = window.scrollY;
  const b = document.body.style;
  b.position = "fixed";
  b.top = `-${lockY}px`;
  b.left = "0";
  b.right = "0";
  b.width = "100%";
  b.overflow = "hidden";
}
function unlockScroll() {
  if (!locked) return;
  locked = false;
  const b = document.body.style;
  b.position = b.top = b.left = b.right = b.width = b.overflow = "";
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, lockY);
  html.style.scrollBehavior = prev;
}

// Sur iPhone, seul le fil de discussion et la rangée de suggestions défilent :
// un glissé ailleurs dans la fenêtre ne fait jamais bouger la page derrière.
sheet.addEventListener(
  "touchmove",
  (e) => {
    const t = e.target as HTMLElement;
    if (t.closest(".jojo__msgs, .jojo__chips")) return;
    e.preventDefault();
  },
  { passive: false }
);
panel.querySelector(".jojo__scrim")?.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

// Clavier du téléphone : la fenêtre se cale sur la zone réellement visible
const vv = window.visualViewport;
const fitViewport = () => {
  if (!vv || panel.hidden) return;
  sheet.style.setProperty("--vvh", `${vv.height}px`);
  sheet.style.setProperty("--vvtop", `${vv.offsetTop}px`);
  if (document.activeElement === input) scrollDown(false);
};
vv?.addEventListener("resize", fitViewport);
vv?.addEventListener("scroll", fitViewport);

let built = false;
function build() {
  if (built) return;
  built = true;
  msgsEl.replaceChildren();
  renderWelcome();
  state.msgs.forEach((m) => (m.from === "user" ? renderUser(m.text) : renderAnswer(m.answer, m.kind)));
  if (state.flow) {
    const step = currentStep();
    if (step) {
      setComposer(step.input);
      if (step.consent) renderConsents();
      else if (step.choices) renderChips(step.choices.map((c) => ({ label: c.l, onPick: () => answerStep(c.v, c.l) })));
      else if (step.multi) renderMulti(step);
      else askStepInputOnly(step);
      if (!step.consent) addCancelChip();
    } else showSummary();
  } else {
    const last = [...state.msgs].reverse().find((m) => m.from === "bot") as Extract<Msg, { from: "bot" }> | undefined;
    if (last) intentChips(last.answer.next ?? ["rdv", "tarifs", "activites"]);
    else chipsEl.hidden = true;
  }
  scrollDown(false);
}

let lastFocus: HTMLElement | null = null;
export function open() {
  build();
  if (!panel.hidden) return;
  lastFocus = document.activeElement as HTMLElement;
  lockScroll();
  panel.hidden = false;
  document.documentElement.classList.add("jojo-open");
  launcher.setAttribute("aria-expanded", "true");
  root.querySelector<HTMLElement>("[data-jojo-badge]")!.hidden = true;
  root.querySelector<HTMLElement>("[data-jojo-teaser]")!.hidden = true;
  fitViewport();
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add("is-open")));
  scrollDown(false);
  window.setTimeout(() => (isPhone() ? root.querySelector<HTMLElement>(".jojo__icon[data-jojo-close]") : input)?.focus({ preventScroll: true }), 60);
}

export function close(instant = false) {
  if (panel.hidden) return;
  panel.classList.remove("is-open");
  document.documentElement.classList.remove("jojo-open");
  launcher.setAttribute("aria-expanded", "false");
  input.blur();
  unlockScroll();
  const done = () => {
    panel.hidden = true;
    lastFocus?.focus?.({ preventScroll: true });
  };
  if (instant || reduced) done();
  else window.setTimeout(done, 320);
}

function restart() {
  window.clearTimeout(typingTimer);
  state = { msgs: [], flow: null };
  save();
  built = false;
  setComposer();
  build();
}

root.querySelectorAll("[data-jojo-close]").forEach((b) => b.addEventListener("click", () => close()));
root.querySelector("[data-jojo-restart]")?.addEventListener("click", restart);
document.addEventListener("keydown", (e) => {
  if (panel.hidden) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close();
    launcher.focus();
  }
  // Garder le focus dans la fenêtre (clavier)
  if (e.key === "Tab") {
    const f = Array.from(sheet.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), [tabindex='0']")).filter((x) => x.offsetParent);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

/** Ouvre Jojo et lance directement un parcours (ex. bouton « Remplir avec Jojo ») */
export function openWith(what: string) {
  open();
  if (what === "booking" && !state.flow) {
    window.setTimeout(() => ask("Demander la visite offerte", () => startFlow("booking")), reduced ? 0 : 280);
  }
}
