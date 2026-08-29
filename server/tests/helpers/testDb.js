import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../../src/config/db.js";
import { Issue } from "../../src/models/Issue.js";
import { Knowledge } from "../../src/models/Knowledge.js";
import { Comment } from "../../src/models/Comment.js";
import { Project } from "../../src/models/Project.js";

/**
 * Test helper for service-layer tests.
 *
 * Deliberately uses a REAL MongoDB connection (via MONGO_URI, the same
 * env var db.js already uses in normal operation) rather than mocking
 * Mongoose or faking the conditional-update mechanism with an in-memory
 * boolean. The concurrency tests specifically depend on this — they only
 * mean something if MongoDB itself is serializing the conditional writes,
 * not a test double pretending to.
 *
 * Requires a running MongoDB instance and MONGO_URI set in the
 * environment before running (see server/README.md). This is the same
 * database setup already verified working locally in Phase A.
 */

export async function setupTestDb() {
  await connectDB();
}

export async function teardownTestDb() {
  await disconnectDB();
}

export async function clearCollections() {
  await Promise.all([
    Issue.deleteMany({}),
    Knowledge.deleteMany({}),
    Comment.deleteMany({}),
    Project.deleteMany({}),
  ]);
}

/**
 * A plain actorContext fixture. Services never query the User collection
 * (confirmed by inspection — none of the four service files import
 * User), so this does not need to correspond to a real User document.
 */
export function fakeActor(role = "USER") {
  return { id: new mongoose.Types.ObjectId().toString(), role };
}

export function fakeObjectId() {
  return new mongoose.Types.ObjectId().toString();
}

export const validPoint = (coords = [77.5, 12.9]) => ({
  type: "Point",
  coordinates: coords,
});
