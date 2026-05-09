import { z } from "zod";
import { PACK_IDS } from "@/lib/packs";
import {
  AUDIENCE_IDS,
  CRENEAU_IDS,
  HORIZON_IDS,
  RELATION_IDS,
  ZONE_IDS,
} from "@/lib/contact-form-options";

export const contactSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom est requis.").max(120),
    email: z.string().trim().email("Adresse e-mail invalide.").max(254),
    phone: z
      .string()
      .trim()
      .max(40)
      .optional()
      .or(z.literal("")),
    subject: z.string().trim().min(2, "Le sujet est requis.").max(200),
    message: z.string().trim().min(10, "Message trop court.").max(8000),
    pack: z.union([z.literal(""), z.enum(PACK_IDS)]).optional(),
    website: z.string().optional(),
    audience: z.union([z.literal(""), z.enum(AUDIENCE_IDS)]).optional(),
    relation: z.union([z.literal(""), z.enum(RELATION_IDS)]).optional(),
    zone: z.union([z.literal(""), z.enum(ZONE_IDS)]).optional(),
    zone_detail: z.string().trim().max(160).optional().or(z.literal("")),
    creneau: z.union([z.literal(""), z.enum(CRENEAU_IDS)]).optional(),
    horizon: z.union([z.literal(""), z.enum(HORIZON_IDS)]).optional(),
    /** Article 1145 et s. C. civ. — capacité à contracter ou représentation légale. */
    legal_capacity_status: z.literal(true, {
      errorMap: () => ({
        message:
          "Vous devez confirmer disposer de votre pleine capacité juridique ou agir en qualité de représentant légal habilité.",
      }),
    }),
    /** Acceptation du protocole d’urgence (art. 223-6 C. pén. — secours en priorité). */
    emergency_protocol_acknowledged: z.literal(true, {
      errorMap: () => ({
        message: "Vous devez accepter le protocole d’urgence (appel des secours en priorité).",
      }),
    }),
    /** Dernier certificat médical d’aptitude aux loisirs — facultatif (AAAA-MM-JJ). */
    medical_cert_date: z.string().max(10).optional().or(z.literal("")),
    /** Risques déglutition, régimes spécifiques — chiffrement en base optionnel. */
    deglutition_risk_alert: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const m = data.medical_cert_date?.trim();
    if (!m || m === "") return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date du certificat invalide — utilisez AAAA-MM-JJ.",
        path: ["medical_cert_date"],
      });
    }
  });

export type ContactInput = z.infer<typeof contactSchema>;
