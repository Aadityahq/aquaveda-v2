import { z } from "zod";
import { objectIdString } from "./shared/objectId.js";

/**
 * Comment request-shape validation.
 *
 * Zod validates that `refType` is one of the two recognized values and
 * that `refId`/`parentComment` are shaped like ObjectIds. It does NOT
 * validate that `refId` actually points to an existing document of the
 * type named by `refType`, and it does NOT validate the one-level
 * nesting rule (a `parentComment` must itself be a top-level comment) —
 * both require reading other documents and are service-layer
 * responsibilities (persistence-design.md §3).
 */
export const createCommentSchema = z.object({
  refType: z.enum(["ISSUE", "WIKI"]),
  refId: objectIdString,
  body: z.string().trim().min(1, "body is required"),
  parentComment: objectIdString.optional().nullable(),
});
