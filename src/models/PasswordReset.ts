import mongoose from "mongoose";

/** Lien de réinitialisation du mot de passe : usage unique, 1 h, seul le hash du jeton est stocké. */
const PasswordResetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "password_resets" },
);
// Nettoyage automatique par MongoDB une journée après l'expiration.
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

export const PasswordReset = mongoose.models.PasswordReset || mongoose.model("PasswordReset", PasswordResetSchema);
