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
  /** Jeton du lien d'invitation envoyé par Céline (obligatoire, sauf pour le compte de Céline). */
  invitation: z.string().trim().max(128).optional(),
});

export const loginWithInvitationSchema = z.object({
  invitation: z.string().trim().max(128).optional(),
});

/* ---------- Espace familles ---------- */

export const dossierSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court.").max(120),
});

export const invitationSchema = z.object({
  label: z.string().trim().min(2, "Indiquez qui vous invitez (ex. : son fils, Paul).").max(120),
});

export const postSchema = z
  .object({
    text: z.string().trim().max(4000, "Message trop long (4 000 caractères maximum).").default(""),
    photoIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(12, "12 photos maximum par publication.").default([]),
    visitDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine((v) => v.text.length > 0 || v.photoIds.length > 0, {
    message: "Écrivez un mot ou ajoutez au moins une photo.",
    path: ["text"],
  });

export const messageSchema = z.object({
  text: z.string().trim().min(1, "Écrivez d’abord votre message.").max(4000, "Message trop long (4 000 caractères maximum)."),
});

export const appointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide."),
  durationMinutes: z.coerce.number().int().min(15, "15 minutes minimum.").max(720, "12 heures maximum."),
  note: z.string().trim().max(500, "500 caractères maximum.").default(""),
});

const newPassword = z
  .string()
  .min(8, "Au moins 8 caractères.")
  .max(128)
  .regex(/[A-Za-z]/, "Au moins une lettre.")
  .regex(/[0-9]/, "Au moins un chiffre.");

export const forgotSchema = z.object({
  email: z.string().trim().email("E-mail invalide.").max(254),
});

export const resetSchema = z.object({
  token: z.string().trim().min(10).max(128),
  password: newPassword,
});

export const changePasswordSchema = z.object({
  current: z.string().min(1, "Mot de passe actuel requis.").max(128),
  password: newPassword,
});
