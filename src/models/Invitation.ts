import mongoose from "mongoose";

/** Lien d'invitation à usage unique, créé par Céline pour un proche. Seul le hash du jeton est stocké. */
const InvitationSchema = new mongoose.Schema(
  {
    dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier", required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "invitations" },
);

export const Invitation = mongoose.models.Invitation || mongoose.model("Invitation", InvitationSchema);
