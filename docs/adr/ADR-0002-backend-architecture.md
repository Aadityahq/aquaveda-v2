# ADR-0002: Keep Express as a separate API service

## Status

Accepted

## Context

Two options were evaluated for the v2 backend:

**Option A (proposed, rejected):** Retire Express entirely. Implement the
backend as Next.js Route Handlers + Server Actions, directly over Mongoose.
One deployable, no CORS configuration, mutations colocated with the pages
that trigger them.

**Option B (accepted):** Keep Express as a separate API service alongside
the Next.js frontend. The frontend talks to it over HTTP. Mongoose, the
service layer, and all domain logic live in the Express service.

## Decision

Keep Express (Option B).

## Why

The original tech stack explicitly listed `Node.js, Express` as part of v2.
ADR-0001 gives authority to choose a better architecture than v1's legacy
choices — but that authority applies to the legacy codebase, not to an
explicit stated decision for v2. Reversing an explicit stack decision
without a concrete problem it solves is change for its own sake.

Additionally: the Express service is already proven at the domain level.
Its controllers, services, and models can be cleaned up (consistent Zod
validation, refresh tokens, proper indexes — all identified in v1's own
upgrade plan) without changing the architectural layer they run on.

## Consequences

- `src/server/` does not exist in the Next.js repository. The backend
  lives in its own service (either a separate repo or a `server/` root
  directory matching v1's layout).
- The Next.js frontend communicates with the backend over HTTP via a typed
  API client (added at the Authentication milestone).
- `jose` replaces `jsonwebtoken` in the frontend's auth middleware because
  `jose` works in both Node.js and the Edge runtime (Next.js middleware
  runs on Edge by default). This is a frontend-only dependency.
- CORS is configured in Express for the Next.js app's origin.
- The backend cleanup work (Zod validation everywhere, refresh tokens,
  DB indexes, DTO responses) proceeds as a separate milestone alongside
  or before the Authentication milestone.
