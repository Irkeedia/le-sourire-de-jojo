/** Tarif horaire brut SAP indicatif (€/h) — aligné présentation Céline 18.05. */
export const TARIF_HORAIRE_BRUT_EUR = 38;

/** Taux crédit d’impôt SAP (50 %). */
export const CREDIT_IMPOT_SAP_TAUX = 0.5;

export type ForfaitActivite = {
  label: string;
  duree: string;
  heures: number;
  brutEur: number;
};

/** Forfaits activités — grille commune site / présentation (montants bruts SAP). */
export const FORFAITS_ACTIVITES: ForfaitActivite[] = [
  { label: "Le pont numérique", duree: "1 h", heures: 1, brutEur: 38 },
  { label: "Biographie de vie", duree: "2 h", heures: 2, brutEur: 74 },
  { label: "Atelier créatif", duree: "2 h", heures: 2, brutEur: 74 },
  { label: "Escapade sensorielle", duree: "2 h", heures: 2, brutEur: 74 },
  { label: "Jeux de société", duree: "2 h", heures: 2, brutEur: 74 },
  { label: "Visite duo avec Lili", duree: "2 h", heures: 2, brutEur: 74 },
  { label: "Moment de détente", duree: "2 h", heures: 2, brutEur: 74 },
  { label: "On se raconte nos vies", duree: "3 h", heures: 3, brutEur: 108 },
  { label: "Lecture & album photo", duree: "3 h", heures: 3, brutEur: 108 },
  { label: "Promenade & courses", duree: "3 h", heures: 3, brutEur: 108 },
];

export function tarifNetApresCredit(brutEur: number): number {
  return Math.round(brutEur * (1 - CREDIT_IMPOT_SAP_TAUX));
}

export function formatEuros(montant: number): string {
  return `${montant} €`;
}

export function forfaitTableRows(): string[][] {
  return FORFAITS_ACTIVITES.map((f) => [
    f.label,
    f.duree,
    formatEuros(f.brutEur),
    formatEuros(tarifNetApresCredit(f.brutEur)),
  ]);
}
