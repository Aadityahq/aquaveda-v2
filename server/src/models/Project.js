import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Project
 *
 * Created from an Issue, never standalone (Product Invariant 3). Has no
 * status/lifecycle field in V2 — existence, contributors, and progress
 * are sufficient (decision-register: Project status deferred).
 *
 * Schema-enforceable constraints (this file):
 * - required fields, type correctness
 * - `originIssue` required + immutable (best-effort, see note below)
 *
 * NOT enforced here (service layer):
 * - that `originIssue`'s current status is in
 *   {acknowledged, in_progress, resolved, verified} at creation time —
 *   requires reading another document's current state, so it belongs to
 *   the `createProject()` service operation, not this schema
 *   (persistence-design.md §6/§7)
 * - `immutable: true` on `originIssue` is defense-in-depth only, same
 *   caveat as Issue.reportedBy / Knowledge.author
 *
 * `contributors` is a plain array of User references. It represents
 * Project *participation* only. It does not represent, encode, or grant
 * any Issue lifecycle authority — appearing in this array does not
 * resolve or imply an answer to D-3a (remediation-assertion authority).
 * No role, assignment, or membership-based authorization mechanism is
 * introduced here or anywhere in this model. See
 * docs/architecture/decision-register.md D-3a and ADR-0003.
 *
 * `progress` is not specified by any approved document beyond "creator-
 * controlled progress tracking." No persistence document locks its shape.
 * Implemented here as a plain free-text String as a V2-level placeholder
 * only — this is an implementation choice, not a domain decision, and
 * should not be read as settling what "progress" means for AquaVeda.
 * A future milestone may replace this with a structured representation
 * (percentage, milestone list, etc.) without that being an architectural
 * reversal — flagged here so it isn't mistaken for one.
 */
const projectSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    originIssue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      immutable: true, // defense-in-depth only; see note above
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contributors: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    progress: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Approved indexes only (persistence-design.md §6 / ADR-0005):
projectSchema.index({ originIssue: 1 });
projectSchema.index({ contributors: 1 }); // multikey index — reverse lookup

// Not proposed, per persistence-design.md §6: no `creator` index (no
// current access pattern browses Projects by creator independently).

export const Project = mongoose.model("Project", projectSchema);
export default Project;
