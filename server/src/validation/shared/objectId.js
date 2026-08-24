import { z } from "zod";

/**
 * A single, genuinely shared validation primitive: is this string shaped
 * like a MongoDB ObjectId? This is not a generic repository/base-model
 * abstraction — it's a one-line format check reused because multiple
 * concrete Zod schemas need the same regex, not because a generic
 * mechanism was invented in search of a use.
 */
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const objectIdString = z
  .string()
  .regex(OBJECT_ID_PATTERN, "must be a valid ObjectId");
