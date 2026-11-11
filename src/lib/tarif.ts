/** Tarif horaire brut SAP indicatif (€/h), confirmé dans le business plan v3. */
export const TARIF_HORAIRE_BRUT_EUR = 38;

/** Taux crédit d’impôt SAP (50 %). */
export const CREDIT_IMPOT_SAP_TAUX = 0.5;

/**
 * Coût après crédit d’impôt de 50 % (19 €). À afficher détaché du prix et toujours en plus petit que lui
 * (arrêté du 17 mars 2015, art. 5) : le prix TTC (38 €) reste l’information principale.
 */
export const TARIF_HORAIRE_NET_EUR = TARIF_HORAIRE_BRUT_EUR * (1 - CREDIT_IMPOT_SAP_TAUX);

/** Forfaits du business plan (version 3, novembre 2026) : volumes et prix TTC fixés par Céline. */
export const FORFAIT_MENSUEL = { heures: 8, brutEur: 280 } as const;
export const PACK_DECOUVERTE = { heures: 3, brutEur: 108 } as const;

export type ForfaitActivite = {
  label: string;
  duree: string;
  heures: number;
  brutEur: number;
};

/**
 * Prix par pôle d'activité (business plan v3) : 38 € l'heure, 74 € les 2 h (37 €/h),
 * 108 € les 3 h (36 €/h). Les sorties durent au moins 2 h.
 */
export const FORFAITS_ACTIVITES: ForfaitActivite[] = [
  { label: "Compagnie & lien social", duree: "1 h", heures: 1, brutEur: 38 },
  { label: "Compagnie & lien social", duree: "2 h", heures: 2, brutEur: 74 },
  { label: "Mobilité & vie sociale (sorties)", duree: "2 h", heures: 2, brutEur: 74 },
  { label: "Mobilité & vie sociale (sorties)", duree: "3 h", heures: 3, brutEur: 108 },
  { label: "Répit & vie pratique", duree: "1 h", heures: 1, brutEur: 38 },
  { label: "Répit & vie pratique", duree: "2 h", heures: 2, brutEur: 74 },
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
