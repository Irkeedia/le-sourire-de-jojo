import nodemailer from "nodemailer";

export type MailPayload = {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
};

export async function sendContactNotification(payload: MailPayload): Promise<void> {
  const host = import.meta.env.SMTP_HOST;
  const port = Number(import.meta.env.SMTP_PORT || "587");
  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;
  const secure = import.meta.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    throw new Error(
      "Configuration e-mail incomplète (SMTP_HOST, SMTP_USER, SMTP_PASS).",
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${payload.fromName}" <${user}>`,
    replyTo: payload.fromEmail,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
}

/** Le serveur sait-il envoyer des e-mails ? */
export function isSmtpConfigured(): boolean {
  return Boolean(import.meta.env.SMTP_HOST && import.meta.env.SMTP_USER && import.meta.env.SMTP_PASS);
}

/** E-mail simple envoyé par le site (ex. réinitialisation du mot de passe). */
export async function sendSiteMail(payload: { to: string; subject: string; text: string }): Promise<void> {
  const user = import.meta.env.SMTP_USER;
  await sendContactNotification({
    fromName: "Le Sourire de Jojo",
    fromEmail: import.meta.env.CONTACT_TO_EMAIL || user || "",
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
}
