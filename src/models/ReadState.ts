import mongoose from "mongoose";

/**
 * Suivi par personne et par dossier :
 * - messagesReadAt : dernière lecture de la messagerie (pastilles « non lu ») ;
 * - seenAt : dernière ouverture de la cloche (notifications « depuis votre dernière visite »).
 */
const ReadStateSchema = new mongoose.Schema(
  {
    dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    messagesReadAt: { type: Date },
    seenAt: { type: Date },
  },
  { collection: "read_states" },
);
ReadStateSchema.index({ dossierId: 1, userId: 1 }, { unique: true });

export const ReadState = mongoose.models.ReadState || mongoose.model("ReadState", ReadStateSchema);
