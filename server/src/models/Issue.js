import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Issue.statusHistory entry
 *
 * Embedded subdocument, per ADR-0005. Records one lifecycle event —
 * either the initial `null -> open` creation entry, or a subsequent
 * status transition (ADR-0003).
 *
 * Schema-enforceable here:
 * - `fromStatus` / `toStatus` enum membership (including `null` for the
 *   initial entry)
 * - required fields
 *
 * NOT enforced here (service layer, ADR-0006):
 * - whether a given fromStatus -> toStatus edge is a legal transition
 * - `resolverId !== verifierId` (cross-entry, contextual — requires
 *   reading a prior history entry, not expressible as a static schema
 *   rule; see persistence-design.md §6)
 * - that `fromStatus` matches the state that was actually current at
 *   write time (this is the conditional-atomic-update invariant from
 *   ADR-0006, enforced by the write operation itself, not by the schema)
 */
const ISSUE_STATUSES = [
  "open",
  "acknowledged",
  "in_progress",
  "resolved",
  "verified",
];

const issueStatusHistoryEntrySchema = new Schema(
  {
    fromStatus: {
      type: String,
      enum: [null, ...ISSUE_STATUSES],
      default: null, // null only for the initial `null -> open` entry
    },
    toStatus: {
      type: String,
      enum: ISSUE_STATUSES,
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // Deliberately NOT role-gated or Project-membership-gated here.
      // D-3a (remediation-assertion authority) is unresolved by design —
      // this field stays a neutral User reference so the eventual
      // authorization mechanism can be layered on in the service layer
      // without a schema migration. See decision-register.md D-3a.
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: true } // default Mongoose behavior kept; each entry gets a stable id
);

/**
 * Issue
 *
 * Schema-enforceable constraints (this file):
 * - required fields, type correctness
 * - `status` enum membership
 * - `location` GeoJSON Point shape + 2dsphere index
 * - `reportedBy` required + immutable (best-effort — see note below)
 *
 * NOT enforced here (service layer):
 * - legality of a status transition (ADR-0003's transition graph)
 * - transition authority (who may perform which transition)
 * - D-3a (authorized remediation actor mechanism) — unresolved by design
 * - `immutable: true` on `reportedBy` is defense-in-depth only; it guards
 *   `.save()` but does not stop every possible update path (e.g. a raw
 *   `updateOne`). The real guarantee is that no service operation ever
 *   exposes `reportedBy` as an updatable field. See persistence-design.md §6.
 *
 * `category` is deliberately a freeform String, not an enum — this
 * resolves decision-register D-9 ("implementation detail") at the point
 * this schema is written, since no approved document specifies a fixed
 * category list. `severity` is treated the same way for the same reason
 * (no approved severity scale exists in any locked document).
 */
const locationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  { _id: false }
);

const issueSchema = new Schema(
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
    location: {
      type: locationSchema,
      required: true,
    },
    severity: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    domain: {
      type: String,
      default: "water",
    },
    status: {
      type: String,
      enum: ISSUE_STATUSES,
      required: true,
      default: "open",
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true, // defense-in-depth only; see note above
    },
    statusHistory: {
      type: [issueStatusHistoryEntrySchema],
      default: [],
      // Includes the initial `null -> open` entry at creation, per
      // ADR-0005 — statusHistory is the complete lifecycle history, not
      // only post-creation transitions. Populating that initial entry is
      // a service-layer responsibility at creation time (Phase D), not
      // something this schema can default on its own, since it needs
      // `reportedBy` and `createdAt` values that only exist once the
      // document is being created.
    },
  },
  { timestamps: true }
);

// Approved indexes only (persistence-design.md §6 / ADR-0005):
issueSchema.index({ location: "2dsphere" });
issueSchema.index({ status: 1 });
issueSchema.index({ reportedBy: 1 });

export const Issue = mongoose.model("Issue", issueSchema);
export default Issue;
