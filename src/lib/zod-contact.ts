import { z } from "zod";
import { PACK_IDS } from "@/lib/packs";

export const contactSchema = z.object({
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
});

export type ContactInput = z.infer<typeof contactSchema>;
