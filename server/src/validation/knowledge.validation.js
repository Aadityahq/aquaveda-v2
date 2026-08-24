import { z } from "zod";

/**
 * Knowledge request-shape validation.
 *
 * `createKnowledgeSchema` covers both draft creation and revision after
 * rejection (ADR-0004: `rejected -> draft` reuses the same entity and the
 * same content shape — there is no separate "revision" DTO because the
 * domain doesn't have a separate revision entity, see ADR-0005 §2's
 * rejection of a Submission/Version concept).
 */
export const createKnowledgeSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  body: z.string().trim().min(1, "body is required"),
  // region is a freeform tag (context.md: "region-based tagging"), not a
  // structured/enumerated geo field — no approved document specifies a
  // fixed region vocabulary.
  region: z.string().trim().optional(),
});

/**
 * Knowledge review-decision request shape.
 *
 * Added during Phase C review: Phase D's approve()/reject() service
 * operations need a validated request body, and the "does this request
 * include non-empty feedback when decision is 'rejected'" check is
 * exactly the same conditional-requiredness pattern already implemented
 * as Mongoose defense-in-depth in Knowledge.js's reviewHistory subdocument.
 * Per the established validation-boundary principle, Zod is the *primary*
 * enforcement point for this — the Mongoose-level check exists only as a
 * backstop, not the main line of defense.
 *
 * This schema validates request shape ONLY. It does NOT validate:
 * - who is allowed to submit this request (review authority — EXPERT
 *   only, per ADR-0004; the schema has no concept of roles)
 * - whether the target Knowledge document is actually in `pending_review`
 *   (requires reading the document's current state — service layer)
 * - `reviewerId !== authorId` (requires reading the document's `author`
 *   field — cross-document/contextual, service layer)
 */
export const reviewKnowledgeSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    feedback: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "rejected") {
      const hasFeedback =
        typeof data.feedback === "string" && data.feedback.length > 0;
      if (!hasFeedback) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["feedback"],
          message:
            "feedback is required and must be non-empty when decision is 'rejected'",
        });
      }
    }
  });

