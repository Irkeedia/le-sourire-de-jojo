import mongoose from "mongoose";

/** Dernière lecture de la messagerie d'un dossier par une personne : sert aux pastilles « non lu ». */
const ReadStateSchema = new mongoose.Schema(
  {
    dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    messagesReadAt: { type: Date, required: true },
  },
  { collection: "read_states" },
);
ReadStateSchema.index({ dossierId: 1, userId: 1 }, { unique: true });

export const ReadState = mongoose.models.ReadState || mongoose.model("ReadState", ReadStateSchema);
