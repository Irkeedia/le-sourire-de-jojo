import mongoose from "mongoose";

let conn: Promise<typeof mongoose> | null = null;

export function getMongoUri(): string | undefined {
  return import.meta.env.MONGODB_URI;
}

export async function connectDb(): Promise<typeof mongoose | null> {
  const uri = getMongoUri();
  if (!uri) return null;
  if (!conn) {
    conn = mongoose.connect(uri);
  }
  return conn;
}
