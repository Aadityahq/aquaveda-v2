import "dotenv/config";
import mongoose from "mongoose";

/**
 * Mongoose connection boundary.
 *
 * Responsibilities:
 * - one connection per process (no per-request connection creation)
 * - fail clearly if the required env var is missing, rather than
 *   connecting to a silent default
 * - surface connection errors instead of swallowing them
 * - expose a clean disconnect path for graceful shutdown
 *
 * This module does not know about Express, routes, or business logic.
 *
 * Environment loading lives HERE, not in server.js. This is the only
 * module that actually needs env vars to connect, and it's imported by
 * both the application entry point (server.js) and the test suite
 * (tests/helpers/testDb.js) — anchoring the dotenv import at the point
 * of consumption means every consumer gets a populated process.env
 * regardless of which entry point they came through. `dotenv/config` is
 * idempotent and a no-op when the vars are already present (e.g. CI
 * environments that inject env vars directly), so this is safe to import
 * unconditionally.
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
 *
 * @param {{ envVar?: string }} [options] - envVar selects which env var
 *   holds the connection string. Defaults to MONGO_URI (application
 *   runtime). Test code must pass `{ envVar: "TEST_MONGO_URI" }`
 *   explicitly — there is no implicit fallback to MONGO_URI, so a test
 *   run can never silently point at the development database.
 */
export async function connectDB({ envVar = "MONGO_URI" } = {}) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = getRequiredEnv(envVar);

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
