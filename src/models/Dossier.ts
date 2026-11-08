import mongoose from "mongoose";

/** Un dossier = une personne accompagnée (ex. « Monsieur Robert »). Ses proches y sont rattachés. */
const DossierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "dossiers" },
);

export const Dossier = mongoose.models.Dossier || mongoose.model("Dossier", DossierSchema);
