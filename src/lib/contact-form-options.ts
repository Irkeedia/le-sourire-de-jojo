/** Options du formulaire de contact (clés stables côté API / base). */

export const AUDIENCE_IDS = [
  "senior_autonome",
  "perte_autonomie",
  "convalescence",
  "handicap_ou_pmr",
  "adulte_isole",
  "aidant_recherche_repit",
  "autre_situation",
] as const;
export type AudienceId = (typeof AUDIENCE_IDS)[number];

export const AUDIENCE_LABELS: Record<AudienceId, string> = {
  senior_autonome: "Personne senior, plutôt autonome",
  perte_autonomie: "Personne senior avec perte d’autonomie",
  convalescence: "Convalescence / retour à domicile",
  handicap_ou_pmr: "Handicap ou mobilité réduite (PMR)",
  adulte_isole: "Adulte isolé (hors senior)",
  aidant_recherche_repit: "Aidant : besoin de répit / relais",
  autre_situation: "Autre situation (précisez dans le message)",
};

export const RELATION_IDS = [
  "personne_concernee",
  "proche_famille",
  "aidant",
  "professionnel",
  "tutelle_ou_curatelle",
  "autre_contact",
] as const;
export type RelationId = (typeof RELATION_IDS)[number];

export const RELATION_LABELS: Record<RelationId, string> = {
  personne_concernee: "Je suis la personne concernée",
  proche_famille: "Proche (famille, voisin·e…)",
  aidant: "Aidant principal",
  professionnel: "Professionnel·le ou structure (santé, social…)",
  tutelle_ou_curatelle: "Représentant·e légal·e (tutelle, curatelle…)",
  autre_contact: "Autre (précisez dans le message)",
};

export const ZONE_IDS = [
  "montauban_centre",
  "montauban_peripherie",
  "corbarieu",
  "lamothe_capdeville",
  "albias",
  "labastide_saint_pierre",
  "saint_nauphary",
  "reynies",
  "montbeton",
  "villeneuve_les_bouloc",
  "autre_82",
  "hors_82",
  "zone_a_discuter",
] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export const ZONE_LABELS: Record<ZoneId, string> = {
  montauban_centre: "Montauban — centre / proche centre",
  montauban_peripherie: "Montauban — périphérie & alentours",
  corbarieu: "Corbarieu",
  lamothe_capdeville: "Lamothe-Capdeville",
  albias: "Albias",
  labastide_saint_pierre: "Labastide-Saint-Pierre",
  saint_nauphary: "Saint-Nauphary",
  reynies: "Reyniès",
  montbeton: "Montbeton",
  villeneuve_les_bouloc: "Villeneuve-lès-Bouloc",
  autre_82: "Autre commune du Tarn-et-Garonne (82)",
  hors_82: "Hors Tarn-et-Garonne",
  zone_a_discuter: "Je ne sais pas / à voir avec vous",
};

export const CRENEAU_IDS = ["matin", "apres_midi", "journee", "flexible", "creneau_a_discuter"] as const;
export type CreneauId = (typeof CRENEAU_IDS)[number];

export const CRENEAU_LABELS: Record<CreneauId, string> = {
  matin: "Plutôt le matin",
  apres_midi: "Plutôt l’après-midi",
  journee: "Journée (sans préférence horaire)",
  flexible: "Très flexible",
  creneau_a_discuter: "À définir ensemble",
};

export const HORIZON_IDS = ["souple", "deux_semaines", "semaine_courante", "urgent", "horizon_a_discuter"] as const;
export type HorizonId = (typeof HORIZON_IDS)[number];

export const HORIZON_LABELS: Record<HorizonId, string> = {
  souple: "Pas de date fixe",
  deux_semaines: "Dans les deux semaines",
  semaine_courante: "Cette semaine",
  urgent: "Besoin prioritaire",
  horizon_a_discuter: "À définir ensemble",
};

export function audienceLabel(id: string): string {
  if (id && id in AUDIENCE_LABELS) return AUDIENCE_LABELS[id as AudienceId];
  return id || "—";
}

export function relationLabel(id: string): string {
  if (id && id in RELATION_LABELS) return RELATION_LABELS[id as RelationId];
  return id || "—";
}

export function zoneLabel(id: string): string {
  if (id && id in ZONE_LABELS) return ZONE_LABELS[id as ZoneId];
  return id || "—";
}

export function creneauLabel(id: string): string {
  if (id && id in CRENEAU_LABELS) return CRENEAU_LABELS[id as CreneauId];
  return id || "—";
}

export function horizonLabel(id: string): string {
  if (id && id in HORIZON_LABELS) return HORIZON_LABELS[id as HorizonId];
  return id || "—";
}
