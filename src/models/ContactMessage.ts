import mongoose from "mongoose";

const ContactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    pack: { type: String },
    audience: { type: String },
    relation: { type: String },
    zone: { type: String },
    zone_detail: { type: String },
    creneau: { type: String },
    horizon: { type: String },
    /** Article 1145 et s. C. civ. — confirmation explicite côté formulaire. */
    legal_capacity_status: { type: Boolean, required: true },
    /** Dernier certificat médical d’aptitude aux loisirs (facultatif). */
    medical_cert_date: { type: Date },
    /** Horodatage serveur à la réception si protocole d’urgence accepté. */
    emergency_protocol_confirmed: { type: Date },
    /** Texte libre — peut être stocké chiffré (préfixe enc:v1:) si chiffrement activé. */
    deglutition_risk_alert: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "contact_messages" },
);

export const ContactMessage =
  mongoose.models.ContactMessage ||
  mongoose.model("ContactMessage", ContactMessageSchema);
