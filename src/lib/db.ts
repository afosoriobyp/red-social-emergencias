import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

const cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = {
  conn: null,
  promise: null,
};

export async function dbConnect(): Promise<typeof mongoose> {
  if (!uri) {
    throw new Error("MONGODB_URI no definida");
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}