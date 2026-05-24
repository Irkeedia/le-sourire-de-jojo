import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail invalide.").max(254),
  password: z.string().min(1, "Mot de passe requis.").max(128),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court.").max(120),
  email: z.string().trim().email("E-mail invalide.").max(254),
  password: z
    .string()
    .min(8, "Au moins 8 caractères.")
    .max(128)
    .regex(/[A-Za-z]/, "Au moins une lettre.")
    .regex(/[0-9]/, "Au moins un chiffre."),
  invite_code: z.string().trim().max(64).optional(),
});

export const carnetEntrySchema = z.object({
  title: z.string().trim().min(1, "Titre requis.").max(200),
  content: z.string().trim().min(1, "Contenu requis.").max(8000),
});
