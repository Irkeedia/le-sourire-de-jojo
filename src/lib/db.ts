import mongoose from "mongoose";
import { getMongoUri } from "@/lib/db-config";

export { getMongoUri } from "@/lib/db-config";

let conn: Promise<typeof mongoose> | null = null;

export async function connectDb(): Promise<typeof mongoose | null> {
  const uri = getMongoUri();
  if (!uri) return null;
  if (!conn) {
    conn = mongoose.connect(uri);
  }
  return conn;
}
