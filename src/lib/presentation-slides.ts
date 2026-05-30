/** Contenu inspiré de « Présentation Céline 18.05.pptx » */

import {
  TARIF_HORAIRE_BRUT_EUR,
  forfaitTableRows,
  tarifNetApresCredit,
} from "@/lib/tarif";

export type SlideImage = {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
  position?: string;
};

export type PresentationSlide =
  | {
      kind: "hero";
      title: string;
      subtitle: string;
      tagline?: string;
      image?: SlideImage;
    }
  | {
      kind: "bullets";
      title: string;
      intro?: string;
      items: string[];
      accent?: "rose" | "sauge" | "bleu" | "jaune";
    }
  | {
      kind: "split";
      title: string;
      text: string;
      image: SlideImage;
    }
  | {
      kind: "mosaic";
      title: string;
      intro?: string;
      accent?: "rose" | "sauge" | "bleu" | "jaune";
      tiles: {
        title: string;
        text: string;
        image: SlideImage;
      }[];
    }
  | {
      kind: "compare";
      title: string;
      headline?: string;
      intro?: string;
      leftTitle: string;
      leftItems: string[];
      rightTitle: string;
      rightItems: string[];
      footer?: string;
      accent?: "rose" | "sauge" | "bleu" | "jaune";
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
      image?: SlideImage;
    };


export const presentationSlides: PresentationSlide[] = [
  {
    kind: "hero",
    title: "Le Sourire de JoJo",
    subtitle: "Illuminer le quotidien à domicile",
    tagline:
      "Le sourire de JoJo a vu le jour pour illuminer le quotidien à domicile. Parce que le lien social est essentiel, mon accompagnement intervient pour rompre la solitude — privilégier la rencontre, partager un sourire.",
    image: {
      src: "/presentation/assets/image1.jpg",
      alt: "Arc-en-ciel au-dessus du Tarn-et-Garonne — symbole d’espoir",
      fit: "cover",
      position: "center 40%",
    },
  },
  {
    kind: "split",
    title: "Mon histoire, mon projet",
    text: "Né d’une épreuve personnelle : accompagner ma maman aux séances de chimiothérapie m’a révélé l’importance vitale d’une présence et d’un sourire. Maman, « mamie Jo » — Jojo pour mon papa : la joie incarnée. Un livre de Lanza Del Vasto : « Tiens-toi droit et souris » — une révélation. Porter cet héritage de bienveillance auprès de ceux qui vivent l’isolement ou l’immobilisation.",
    image: {
      src: "/presentation/assets/image19.jpeg",
      alt: "Portrait bienveillant — l’esprit mamie Jo",
      fit: "contain",
      position: "center center",
    },
  },
  {
    kind: "split",
    title: "Pourquoi ce projet ?",
    text: "Après une carrière de cadre, j’ai choisi de revenir à l’essentiel : l’humain. Le Sourire de JoJo, c’est ma promesse : un regard attentif, une écoute complice, une joie de vivre pour transformer les « boiteries » du quotidien en une forme de danse — pour aînés, convalescents ou enfants momentanément empêchés.",
    image: {
      src: "/images/image%20index/Unknown-4.jpg",
      alt: "Céline Meunier Benneji en extérieur, dans un jardin",
      fit: "cover",
      position: "center 25%",
    },
  },
  {
    kind: "mosaic",
    title: "Un sourire pour tous",
    accent: "bleu",
    tiles: [
      {
        title: "Nos aînés",
        text: "Maintenir le lien social et l’autonomie par la joie de vivre.",
        image: {
          src: "/images/personneagé.png",
          alt: "Moment de lecture avec une personne âgée",
          fit: "cover",
          position: "center 20%",
        },
      },
      {
        title: "Convalescents",
        text: "Soutenir les adultes immobilisés suite à un accident de la vie.",
        image: {
          src: "/presentation/assets/image15.jpg",
          alt: "Lecture partagée et présence bienveillante",
          fit: "cover",
          position: "center center",
        },
      },
      {
        title: "Enfants",
        text: "Accompagner les plus jeunes momentanément empêchés.",
        image: {
          src: "/images/enfant.png",
          alt: "Enfant souriant lors d’une activité à domicile",
          fit: "cover",
          position: "center 15%",
        },
      },
    ],
  },
  {
    kind: "split",
    title: "Le carnet des sourires",
    text: "Au cœur de la philosophie : l’accompagnement n’est jamais une simple prestation technique. Le Carnet rend visible l’invisible — photos, pétale pressé, citations, victoires du jour. Il relie les séances, valorise les progrès et rassure la famille. Numérisé sur un intranet sécurisé.",
    image: {
      src: "/images/carnet2.jpg",
      alt: "Carnet de Sourires ouvert — Le Sourire de JoJo",
      fit: "contain",
      position: "center center",
    },
  },
  {
    kind: "mosaic",
    title: "Loisirs & confort",
    intro: "Un service clé en main : je me déplace avec mon matériel de soutien à la marche et mes ateliers ludiques.",
    accent: "jaune",
    tiles: [
      {
        title: "Lecture & album",
        text: "Biographie de vie, récits et souvenirs partagés.",
        image: {
          src: "/presentation/assets/image12.jpg",
          alt: "Lecture et roses — moment de douceur",
          fit: "cover",
          position: "center center",
        },
      },
      {
        title: "Jeux de société",
        text: "Plaisir sans performance, à la maison ou en sortie.",
        image: {
          src: "/presentation/assets/image25.jpg",
          alt: "Jeux de société apportés pour l’accompagnement",
          fit: "cover",
          position: "center center",
        },
      },
      {
        title: "Promenades",
        text: "Sorties, courses et escapades sensorielles à son rythme.",
        image: {
          src: "/images/balade.png",
          alt: "Promenade bienveillante en plein air",
          fit: "cover",
          position: "center 35%",
        },
      },
    ],
  },
  {
    kind: "compare",
    title: "Qu’est-ce qui me différencie ?",
    headline: "Être une « dame de compagnie moderne » — lever tous les freins logistiques pour les familles.",
    intro:
      "Je transforme votre domicile en un espace de vie dynamique, sans contrainte pour vous.",
    accent: "sauge",
    leftTitle: "Ce que vous connaissez",
    leftItems: [
      "Simple présence, surveillance, télévision",
      "Dépendance au matériel présent dans le foyer",
      "Pas ou peu de transmission structurée à la famille",
      "Forfait avec minimum d’heures obligatoires",
      "Grande structure : salarié du moment, sans lien personnalisé",
    ],
    rightTitle: "Ce que je propose",
    rightItems: [
      "Posture active : stimulation, jeux, perles et sorties",
      "Autonomie technique : fauteuil, déambulateur Georgette",
      "Carnet de Sourires : traçabilité vivante et rassurante",
      "Flexibilité — même 1 h 30 pour rompre la solitude",
      "Local & personnalisé : Céline, pas une administration",
    ],
  },
  {
    kind: "table",
    title: "Offres & forfaits",
    intro: `Tarif horaire ${TARIF_HORAIRE_BRUT_EUR} € brut · ${tarifNetApresCredit(TARIF_HORAIRE_BRUT_EUR)} € après crédit d’impôt 50 % (SAP).`,
    headers: ["Thème", "Heures", "Coût brut", "Après impôt"],
    rows: forfaitTableRows(),
    note: "Toutes les activités peuvent aussi se faire à l’heure. Hors zone : sur devis.",
  },
  {
    kind: "split",
    title: "Les aides possibles",
    text: "Crédit d’impôt de 50 % automatique (service à la personne) · APA via le Conseil départemental du Tarn-et-Garonne (dès 60 ans) · PCH via la MDPH (sans limite d’âge) · Chèques CESU des caisses de retraite (Agirc-Arrco, CARSAT, MSA…).",
    image: {
      src: "/presentation/assets/image26.png",
      alt: "Zone d’intervention — Montauban, Corbarieu, Tarn-et-Garonne",
      fit: "contain",
      position: "center center",
    },
  },
  {
    kind: "contact",
    title: "Ma conclusion & contact",
    text: "Au-delà d’une aide logistique, Le Sourire de JoJo est une promesse de présence authentique et de dignité partagée. C’est ensemble, avec bienveillance et dynamisme, que nous cultiverons ce lien social précieux.",
    phone: "06 66 30 96 22",
    siteLabel: "le-sourire-de-jojo.fr",
    siteHref: "/",
    location: "Basée à Corbarieu et environs — Montauban, Tarn-et-Garonne (82)",
    image: {
      src: "/images/carnet.png",
      alt: "Carnet de Sourires — Le Sourire de JoJo",
      fit: "contain",
      position: "center center",
    },
  },
];

export const PRESENTATION_PPTX_HREF = "/presentation/Pr%C3%A9sentation%20C%C3%A9line%2018.05.pptx";
