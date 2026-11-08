import mongoose from "mongoose";

/**
 * Messagerie d'un dossier : conversation entre Céline et les proches.
 * Séparée du carnet de sourires (les visites restent dans Post).
 */
const MessageSchema = new mongoose.Schema(
  {
    dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier", required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: ["family", "admin"], required: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "messages" },
);
MessageSchema.index({ dossierId: 1, createdAt: -1 });

export const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);
