import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * User
 *
 * Identity and role anchor for every other collection. This milestone
 * persists the shape only — registration, login, password hashing, and
 * role-assignment mechanisms belong to the Authentication/Governance
 * milestone (out of scope here; see docs/domain/decision-register.md D-2).
 *
 * Schema-enforceable constraints (this file):
 * - required fields, type correctness
 * - `email` uniqueness (via index)
 * - `role` enum membership
 * - `bio` max length
 * - `passwordHash` excluded from default query projection and from JSON
 *   serialization
 *
 * NOT enforced here (service-layer / Authentication milestone):
 * - how a password is hashed, verified, or rotated
 * - how a user is granted EXPERT or ADMIN (decision-register D-2, deferred)
 * - account suspension/deactivation (decision-register D-1, deferred —
 *   deliberately no `status`/`isActive` field exists on this schema)
 */

const BIO_MAX_LENGTH = 500; // No approved document specifies this number.
// A V2-level implementation placeholder only — not a locked domain
// decision. Reasonable to keep for now (prevents unbounded free text),
// but should not be treated as authoritative; revisit if any future
// milestone needs a different bound.

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // creates the approved unique index
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // excluded from query results unless explicitly requested
    },
    role: {
      type: String,
      enum: ["USER", "EXPERT", "ADMIN"],
      required: true,
      default: "USER",
    },
    bio: {
      type: String,
      maxlength: BIO_MAX_LENGTH,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Defense-in-depth alongside `select: false` — belt-and-suspenders
        // against passwordHash ever reaching a serialized response, even
        // if a future query explicitly re-selects it.
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Approved index: unique email (uniqueness comes from `unique: true` above;
// no separate index() call needed for this one).

export const User = mongoose.model("User", userSchema);
export default User;
