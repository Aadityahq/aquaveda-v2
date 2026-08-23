import mongoose from "mongoose";

/**
 * Mongoose connection boundary.
 *
 * Responsibilities:
 * - one connection per process (no per-request connection creation)
 * - fail clearly if MONGO_URI is missing, rather than connecting to a
 *   silent default
 * - surface connection errors instead of swallowing them
 * - expose a clean disconnect path for graceful shutdown
 *
 * This module does not know about Express, routes, or business logic.
 */

// Tracks an in-flight connection attempt so concurrent calls to connectDB()
// (e.g. during startup) reuse the same attempt instead of racing to open a
// second connection.
let connectionPromise = null;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        "See server/README.md for the expected environment variables."
    );
  }
  return value;
}

/**
 * Connect to MongoDB. Safe to call multiple times — returns the existing
 * connection if already connected, or the in-flight promise if a
 * connection attempt is already underway.
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = getRequiredEnv("MONGO_URI");

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected");
  });

  connectionPromise = mongoose
    .connect(uri)
    .then((conn) => {
      console.log("[db] MongoDB connected");
      return conn.connection;
    })
    .catch((err) => {
      // Allow a subsequent call to retry rather than being stuck on a
      // rejected promise forever.
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

/**
 * Disconnect cleanly. Intended for graceful shutdown (SIGINT/SIGTERM) and
 * for test teardown. Safe to call when not connected.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  connectionPromise = null;
  console.log("[db] MongoDB disconnected cleanly");
}
