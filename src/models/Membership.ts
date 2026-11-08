import mongoose from "mongoose";

/** Rattache un proche (compte famille) à un dossier. Sans cette ligne, aucun accès au dossier. */
const MembershipSchema = new mongoose.Schema(
  {
    dossierId: { type: mongoose.Schema.Types.ObjectId, ref: "Dossier", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "memberships" },
);
MembershipSchema.index({ dossierId: 1, userId: 1 }, { unique: true });

export const Membership = mongoose.models.Membership || mongoose.model("Membership", MembershipSchema);
