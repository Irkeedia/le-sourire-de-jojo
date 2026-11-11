/**
 * Catalogue des activités, repris du business plan de Céline (version 3, novembre 2026).
 * Source unique pour la page Services, l'accueil et la présentation.
 */
export type PoleId = "compagnie" | "mobilite" | "repit";

export type Pole = {
  id: PoleId;
  titre: string;
  accroche: string;
  dureeMin: string;
  image: string;
  imageAlt: string;
  activites: { nom: string; detail?: string }[];
};

export const POLES: Pole[] = [
  {
    id: "compagnie",
    titre: "Compagnie & lien social",
    accroche:
      "Rompre l’isolement et garder l’esprit en éveil : un temps d’échange convivial, à la maison, sans jamais mettre en échec.",
    dureeMin: "À partir de 1 h",
    image: "/images/personne-agee-1600.webp",
    imageAlt: "Moment de lecture et d’échange avec une personne âgée, dans un cadre chaleureux.",
    activites: [
      { nom: "Temps d’échange", detail: "discussion autour d’un café ou d’un thé" },
      { nom: "Lecture", detail: "presse ou livres, à voix haute" },
      { nom: "Écoute des récits de vie" },
      { nom: "Musique" },
      { nom: "Tri de photos" },
      { nom: "Jeux de société" },
      { nom: "Atelier mémoire et mots croisés partagés" },
      { nom: "Puzzle" },
      { nom: "Ateliers créatifs", detail: "perles, couture, mandalas" },
      { nom: "Atelier détente des mains", detail: "pose de vernis" },
    ],
  },
  {
    id: "mobilite",
    titre: "Mobilité & vie sociale",
    accroche:
      "Des sorties à thème qui commencent à la maison et se prolongent dehors : prendre l’air, voir du monde, garder ses repères.",
    dureeMin: "À partir de 2 h",
    image: "/images/balade.webp",
    imageAlt: "Promenade en plein air, à son rythme, pour profiter du quartier.",
    activites: [
      { nom: "Pages & paysages", detail: "lecture à la maison, puis balade" },
      { nom: "Souvenirs & sortie rétro", detail: "récit de vie, puis sortie culturelle (marché, exposition)" },
      { nom: "Paroles & pousses", detail: "discussion et petit jardinage" },
      { nom: "Papotes & panier", detail: "liste de courses, puis marché ou commerces" },
      { nom: "Lecture & lunettes", detail: "lecture de la presse, puis rendez-vous chez l’opticien" },
      { nom: "Écoute & escorte", detail: "moment d’écoute, puis accompagnement à un rendez-vous santé ou à la pharmacie" },
    ],
  },
  {
    id: "repit",
    titre: "Répit & vie pratique",
    accroche:
      "Permettre au parent solo ou au proche aidant de souffler, et aider dans les petites tâches du quotidien qui pèsent.",
    dureeMin: "À partir de 1 h",
    image: "/images/enfant.webp",
    imageAlt: "Enfant souriant lors d’une activité partagée à domicile.",
    activites: [
      { nom: "Relais du parent solo ou de l’aidant", detail: "présence rassurante, continuité des habitudes" },
      { nom: "Aide au tri du courrier" },
      { nom: "Organisation des papiers de la vie courante" },
      { nom: "Aide aux démarches simples sur tablette ou ordinateur" },
    ],
  },
];

/** Ce qui est compris dans toutes les formules. */
export const INCLUS = [
  "Une visite d’évaluation offerte à domicile (environ 45 minutes)",
  "Le carnet des sourires, rempli à chaque visite",
  "L’espace familles en ligne, pour suivre les visites à distance",
  "Les déplacements dans la zone d’intervention",
];

/** Ce que Céline ne fait pas (business plan v3, « Le public »). */
export const EXCLUSIONS = [
  "Aucun soin ni acte médical",
  "Pas d’aide à la toilette",
  "Pas de préparation ni de prise de médicaments",
  "Pas de gestion d’argent ni de procuration",
];

/** Communes de la zone d’intervention (business plan v3, carte « Zone d’intervention »). */
export const COMMUNES_ZONE = [
  "Corbarieu",
  "Labastide-Saint-Pierre",
  "Bressols",
  "Reyniès",
  "Saint-Nauphary",
  "Orgueil",
  "Campsas",
  "Montauban",
];
