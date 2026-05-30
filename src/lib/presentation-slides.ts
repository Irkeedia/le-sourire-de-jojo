/** Contenu inspiré de « Présentation Céline 18.05.pptx » */

export type PresentationSlide =
  | {
      kind: "hero";
      title: string;
      subtitle: string;
      tagline?: string;
      image?: string;
      imageAlt?: string;
    }
  | {
      kind: "bullets";
      title: string;
      intro?: string;
      items: string[];
      accent?: "rose" | "sauge" | "bleu" | "jaune";
      image?: string;
      imageAlt?: string;
    }
  | {
      kind: "split";
      title: string;
      text: string;
      image: string;
      imageAlt: string;
    }
  | {
      kind: "compare";
      title: string;
      leftTitle: string;
      leftItems: string[];
      rightTitle: string;
      rightItems: string[];
      footer?: string;
    }
  | {
      kind: "table";
      title: string;
      intro?: string;
      headers: string[];
      rows: string[][];
      note?: string;
    }
  | {
      kind: "contact";
      title: string;
      text: string;
      phone: string;
      siteLabel: string;
      siteHref: string;
      location: string;
    };

/** Tarif horaire brut indiqué dans la présentation PowerPoint (18.05). */
export const PRESENTATION_TARIF_HORAIRE_EUR = 38;

export const presentationSlides: PresentationSlide[] = [
  {
    kind: "hero",
    title: "Le Sourire de JoJo",
    subtitle: "Illuminer le quotidien à domicile",
    tagline:
      "Le sourire de JoJo a vu le jour pour illuminer le quotidien à domicile. Parce que le lien social est essentiel, mon accompagnement intervient pour rompre la solitude — privilégier la rencontre, partager un sourire.",
    image: "/presentation/assets/image1.jpg",
    imageAlt: "Le Sourire de JoJo — accompagnement bienveillant",
  },
  {
    kind: "bullets",
    title: "Mon histoire, mon projet",
    intro:
      "Né d’une épreuve personnelle : accompagner ma maman aux séances de chimiothérapie m’a révélé l’importance vitale d’une présence et d’un sourire.",
    items: [
      "Maman, « mamie Jo » — Jojo pour mon papa : la joie incarnée malgré les épreuves",
      "Un livre de Lanza Del Vasto : « Tiens-toi droit et souris » — une révélation",
      "Porter cet héritage de bienveillance auprès de ceux qui vivent l’isolement ou l’immobilisation",
      "Le Sourire de JoJo : une mission de dignité partagée",
    ],
    accent: "rose",
  },
  {
    kind: "bullets",
    title: "Pourquoi ce projet ?",
    intro: "Après une carrière de cadre, j’ai choisi de revenir à l’essentiel : l’humain. Le Sourire de JoJo, c’est ma promesse.",
    items: [
      "Bien plus qu’une simple présence — pour aînés, convalescents ou enfants momentanément empêchés",
      "Un regard attentif qui reconnaît leur valeur et leur histoire",
      "Une écoute complice : lectures, souvenirs ou silences partagés",
      "Une joie de vivre pour transformer les « boiteries » du quotidien en une forme de danse",
    ],
    accent: "sauge",
  },
  {
    kind: "bullets",
    title: "Un sourire pour tous",
    items: [
      "Nos aînés — maintenir le lien social et l’autonomie par la joie de vivre",
      "Convalescents — soutenir les adultes immobilisés suite à un accident de la vie",
      "Enfants — accompagner les plus jeunes momentanément empêchés",
    ],
    accent: "bleu",
    image: "/presentation/assets/image10.jpg",
    imageAlt: "Accompagnement intergénérationnel bienveillant",
  },
  {
    kind: "split",
    title: "Le carnet des sourires",
    text: "Au cœur de la philosophie : l’accompagnement n’est jamais une simple prestation technique. Le Carnet rend visible l’invisible — photos, pétale pressé, citations, victoires du jour. Approche humaine et chaleureuse, pas clinique. Il relie les séances, valorise les progrès et rassure la famille. Numérisé sur un intranet sécurisé.",
    image: "/images/carnet.png",
    imageAlt: "Carnet de Sourires Le Sourire de JoJo",
  },
  {
    kind: "bullets",
    title: "Loisirs & confort",
    intro: "Un service clé en main : je me déplace avec mon matériel de soutien à la marche et mes ateliers ludiques.",
    items: [
      "Biographie de vie · Atelier créatif · Escapade sensorielle",
      "Jeux de société · Promenades et courses · Lecture et album photo",
      "La visite duo avec Lili · Le pont numérique",
      "Petit moment plaisir et détente · On se raconte nos vies",
    ],
    accent: "jaune",
    image: "/presentation/assets/image11.png",
    imageAlt: "Activités loisirs et confort à domicile",
  },
  {
    kind: "compare",
    title: "Qu’est-ce qui me différencie ?",
    leftTitle: "Ce que vous connaissez",
    leftItems: [
      "Simple présence, surveillance, télévision",
      "Dépendance au matériel présent dans le foyer",
      "Peu de transmission structurée à la famille",
      "Forfaits avec minimum d’heures obligatoires",
      "Grande structure, salarié disponible sur le moment",
    ],
    rightTitle: "Ce que je propose",
    rightItems: [
      "Posture active : stimulation, jeux, perles, sorties",
      "Autonomie technique : fauteuil, déambulateur Georgette",
      "Carnet de Sourires : traçabilité vivante et rassurante",
      "Flexibilité — même 1 h 30 pour rompre la solitude",
      "Local & personnalisé : Céline, pas une administration",
    ],
    footer: "Être une « dame de compagnie moderne », c’est lever les freins logistiques pour les familles.",
  },
  {
    kind: "table",
    title: "Offres & forfaits",
    intro: `Tarif horaire ${PRESENTATION_TARIF_HORAIRE_EUR} € brut · ${PRESENTATION_TARIF_HORAIRE_EUR / 2} € après crédit d’impôt 50 % (SAP).`,
    headers: ["Thème", "Heures", "Coût brut", "Après impôt"],
    rows: [
      ["Le pont numérique", "1 h", "38 €", "19 €"],
      ["Biographie de vie", "2 h", "74 €", "38 €"],
      ["Atelier créatif", "2 h", "74 €", "38 €"],
      ["Escapade sensorielle", "2 h", "74 €", "38 €"],
      ["Jeux de société", "2 h", "74 €", "38 €"],
      ["Visite duo avec Lili", "2 h", "74 €", "38 €"],
      ["Moment de détente", "2 h", "74 €", "38 €"],
      ["On se raconte nos vies", "3 h", "108 €", "54 €"],
      ["Lecture & album photo", "3 h", "108 €", "54 €"],
      ["Promenade & courses", "3 h", "108 €", "54 €"],
    ],
    note: "Toutes les activités peuvent aussi se faire à l’heure. Hors zone : sur devis.",
  },
  {
    kind: "bullets",
    title: "Les aides possibles",
    items: [
      "Crédit d’impôt de 50 % — automatique (service à la personne)",
      "APA — Conseil départemental du Tarn-et-Garonne (dès 60 ans) pour la dame de compagnie",
      "PCH — MDPH, sans limite d’âge, équivalent pour le handicap",
      "Caisses de retraite (Agirc-Arrco, CARSAT, MSA…) — budgets ou chèques CESU",
    ],
    accent: "sauge",
  },
  {
    kind: "contact",
    title: "Ma conclusion & contact",
    text: "Au-delà d’une aide logistique, Le Sourire de JoJo est une promesse de présence authentique et de dignité partagée. C’est ensemble, avec bienveillance et dynamisme, que nous cultiverons ce lien social précieux.",
    phone: "06 66 30 96 22",
    siteLabel: "le-sourire-de-jojo.fr",
    siteHref: "/",
    location: "Basée à Corbarieu et environs — Montauban, Tarn-et-Garonne (82)",
  },
];

export const PRESENTATION_PPTX_HREF = "/presentation/Pr%C3%A9sentation%20C%C3%A9line%2018.05.pptx";
