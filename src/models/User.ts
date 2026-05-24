import mongoose from "mongoose";

export type UserRole = "family" | "admin";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["family", "admin"], default: "family" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "users" },
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
