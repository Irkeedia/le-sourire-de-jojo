import mongoose from "mongoose";

const CarnetEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 8000 },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "carnet_entries" },
);

export const CarnetEntry =
  mongoose.models.CarnetEntry || mongoose.model("CarnetEntry", CarnetEntrySchema);
