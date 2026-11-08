import mongoose from "mongoose";

/**
 * Une publication dans le fil d'un dossier :
 * - « visite » : compte-rendu de Céline (texte + photos, pages du carnet numérisées) ;
 * - « message » : mot d'un proche ou de Céline.
 */
const PostSchema = new mongoose.Schema(
  {
    dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier", required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: ["family", "admin"], required: true },
    kind: { type: String, enum: ["visite", "message"], required: true },
    text: { type: String, trim: true, maxlength: 4000, default: "" },
    visitDate: { type: Date },
    photoIds: [{ type: mongoose.Schema.Types.ObjectId }],
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "posts" },
);

export const Post = mongoose.models.Post || mongoose.model("Post", PostSchema);
