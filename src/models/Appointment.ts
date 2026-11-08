import mongoose from "mongoose";

/** Une visite prévue à l'agenda d'un dossier (heure de Paris, stockée en UTC). */
const AppointmentSchema = new mongoose.Schema(
  {
    dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier", required: true },
    startsAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 720 },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "appointments" },
);
AppointmentSchema.index({ dossierId: 1, startsAt: 1 });

export const Appointment = mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);
