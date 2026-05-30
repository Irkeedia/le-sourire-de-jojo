import { LOGO_SRC } from "@/lib/brand";

export const SITE_NAME = "Le Sourire de Jojo";
export const SITE_TAGLINE = "Présence, Écoute & Sourires";
export const DEFAULT_OG_IMAGE = "/images/personneagé.png";
export const DEFAULT_LOCALE = "fr_FR";

export const CONTACT_PHONE = "06 66 30 96 22";
export const CONTACT_PHONE_E164 = "+33666309622";

export const DEFAULT_DESCRIPTION =
  "Accompagnement social et bienveillant à domicile (Céline Meunier Benneji) — lien, dignité, intergénérationnel. Montauban, Corbarieu, Tarn-et-Garonne.";

export const allowIndexing =
  import.meta.env.PUBLIC_ALLOW_INDEXING === "true" || import.meta.env.PUBLIC_ALLOW_INDEXING === "1";

/** Pages publiques indexables (hors compte, imprimables, présentation slide deck). */
export const SITEMAP_ROUTES: { path: string; changefreq: string; priority: number }[] = [
  { path: "/", changefreq: "weekly", priority: 1 },
  { path: "/a-propos", changefreq: "monthly", priority: 0.85 },
  { path: "/services", changefreq: "monthly", priority: 0.9 },
  { path: "/offres", changefreq: "monthly", priority: 0.9 },
  { path: "/carnet", changefreq: "monthly", priority: 0.85 },
  { path: "/partenaires", changefreq: "monthly", priority: 0.75 },
  { path: "/contact", changefreq: "monthly", priority: 0.9 },
  { path: "/legal", changefreq: "yearly", priority: 0.6 },
  { path: "/contrat", changefreq: "yearly", priority: 0.55 },
  { path: "/cgv", changefreq: "yearly", priority: 0.55 },
  { path: "/conditions-annulation", changefreq: "yearly", priority: 0.55 },
  { path: "/consentement", changefreq: "yearly", priority: 0.5 },
  { path: "/plan-du-site", changefreq: "monthly", priority: 0.4 },
];

export const HOME_FAQ = [
  {
    question: "Est-ce du médical ou du paramédical ?",
    answer:
      "Non : nous n’effectuons pas d’actes de soin ni d’actes réservés aux professions réglementées. En cas de besoin de nursing ou de suivi médical, nous orientons vers les professionnels compétents.",
  },
  {
    question: "Les aidants familiaux peuvent-ils vous solliciter ?",
    answer:
      "Oui. Un créneau régulier permet de souffler tout en sachant que la personne accompagnée a eu du lien et de la stimulation. Nous pouvons nous coordonner sur les priorités de la semaine.",
  },
  {
    question: "Quelles aides pour financer l’accompagnement ?",
    answer:
      "Le crédit d’impôt de 50 % s’applique automatiquement aux prestations SAP éligibles (Avance immédiate possible). Selon la situation, l’APA, la PCH ou des chèques CESU des caisses de retraite peuvent aussi couvrir une partie des factures.",
  },
  {
    question: "Comment fixez-vous les durées et la fréquence ?",
    answer:
      "Au premier contact, nous définissons une série de séances pilote puis nous ajustons selon les retours — fatigue, envies, saisonnalité.",
  },
  {
    question: "Que se passe-t-il si la journée est difficile ?",
    answer:
      "Nous privilégions l’écoute et la réduction des stimuli : à la maison, il est toujours possible de raccourcir une activité ou de simplement être présent·e sans agenda imposé.",
  },
] as const;

export function resolveSiteUrl(siteHref: string | undefined, origin: string): string {
  const raw = siteHref ?? import.meta.env.PUBLIC_SITE_URL ?? origin;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function absoluteUrl(path: string, siteUrl: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return new URL(path.startsWith("/") ? path : `/${path}`, `${siteUrl}/`).href;
}

export function buildLocalBusiness(siteUrl: string) {
  const contactEmail = import.meta.env.PUBLIC_CONTACT_EMAIL?.trim();

  return {
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#organization`,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: siteUrl,
    image: absoluteUrl(LOGO_SRC, siteUrl),
    logo: absoluteUrl(LOGO_SRC, siteUrl),
    telephone: CONTACT_PHONE_E164,
    ...(contactEmail ? { email: contactEmail } : {}),
    founder: {
      "@type": "Person",
      name: "Céline Meunier Benneji",
    },
    areaServed: [
      { "@type": "City", name: "Montauban" },
      { "@type": "City", name: "Corbarieu" },
      { "@type": "AdministrativeArea", name: "Tarn-et-Garonne" },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Montauban",
      addressRegion: "Occitanie",
      addressCountry: "FR",
    },
    priceRange: "$$",
    knowsLanguage: "fr",
    serviceType: "Accompagnement social à domicile",
  };
}

export function buildWebSite(siteUrl: string) {
  return {
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: SITE_NAME,
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "fr-FR",
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export function buildWebPage(params: {
  siteUrl: string;
  canonical: string;
  title: string;
  description: string;
}) {
  return {
    "@type": "WebPage",
    "@id": `${params.canonical}#webpage`,
    url: params.canonical,
    name: params.title,
    description: params.description,
    isPartOf: { "@id": `${params.siteUrl}/#website` },
    inLanguage: "fr-FR",
  };
}

export function buildBreadcrumbList(
  items: { href?: string; label: string }[],
  siteUrl: string,
  pageUrl: string,
) {
  const list = [{ href: "/", label: "Accueil" }, ...items.filter((item) => item.href !== "/")];

  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: list.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href, siteUrl) } : {}),
    })),
  };
}

export function buildFaqPage(faqs: readonly { question: string; answer: string }[], pageUrl: string) {
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildServiceList(siteUrl: string) {
  const services = [
    "Lecture et discussion",
    "Sorties et promenades",
    "Jeux et activités",
    "Biographie de vie",
    "Accompagnement numérique",
    "Créations et loisirs",
    "Visites duo intergénérationnelles",
  ];

  return services.map((name) => ({
    "@type": "Service",
    name,
    provider: { "@id": `${siteUrl}/#organization` },
    areaServed: { "@type": "AdministrativeArea", name: "Tarn-et-Garonne" },
    serviceType: "Accompagnement social à domicile",
  }));
}

export type JsonLd = Record<string, unknown>;

export function mergeJsonLd(schemas: JsonLd[]): JsonLd {
  const cleaned = schemas.filter(Boolean);
  if (cleaned.length === 0) return {};
  if (cleaned.length === 1) {
    return { "@context": "https://schema.org", ...cleaned[0] };
  }
  return {
    "@context": "https://schema.org",
    "@graph": cleaned,
  };
}
