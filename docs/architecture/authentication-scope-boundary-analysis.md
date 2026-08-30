# Authentication milestone — scope-boundary analysis (Step 2)

**Status: analysis only. No code. No decision-register promotion.**
Produced in response to the explicit instruction not to assume routes
are scope creep merely because Phase D had none, and to determine the
correct boundary rather than a default.

---

## The central question, answered directly

**Yes — the Authentication milestone includes a minimal auth API
surface. It does not include, and must not slide into, a general
Routes milestone.**

These are not the same kind of thing wearing the same clothes (Express
endpoints). They cross different architectural boundaries, and treating
them identically because both happen to be `router.post(...)` calls is
exactly the collapse the instructions warn against.

---

## A. Authentication infrastructure

Password hashing, registration/login logic, JWT creation/verification,
refresh/session handling, authentication middleware, `actorContext`
construction.

1. **Belongs in the milestone.** Trivially — this *is* the milestone.
2. **Why**: nothing else in the codebase can produce identity. This is
   the actual deliverable.
3. **Boundary crossed**: raw HTTP request → verified identity. This is
   the boundary Phase D deliberately stopped short of (`actorContext` as
   an opaque *input*) and the one boundary this milestone exists to
   build.
4. **Supporting decisions**: Phase D's `decision-register.md` entry
   ("services never decode JWTs, read headers, or query session
   state"); L2 (cookie-only transport, locked this review); the original
   V1 finding that JWT middleware trusted decoded payloads without a DB
   lookup, which this infrastructure is explicitly built to fix.
5. **If deferred**: nothing else can proceed. This isn't optional or
   partially deferrable — it's the floor the rest of the milestone
   stands on.

---

## B. Minimal authentication API surface

`POST /auth/register`, `POST /auth/login`, `POST /auth/logout`,
`GET /auth/me`, and a refresh endpoint (shape depends on the still-open
refresh-storage decision, but *some* endpoint is needed regardless of
which storage model is chosen).

1. **Belongs in the milestone.**
2. **Why**: this is the part of the instruction worth stating plainly —
   **authentication infrastructure without an API surface is not
   usable.** A JWT-signing function and a DB-lookup middleware are
   inert until something on the browser side can call `POST
   /auth/login` and receive a `Set-Cookie` response. There is no
   version of "ship Authentication" that stops at infrastructure and
   calls the milestone done; a login system nobody can call is not a
   login system, it's a library. The milestone's own stated purpose —
   "build real session/identity so service calls get a real
   `actorContext`" — cannot be verified, let alone used, without a way
   to establish that session from outside the process.
3. **Boundary crossed**: this is still squarely within the
   identity/session boundary from A, not the domain-service boundary.
   Register/login/logout/me/refresh do not call `issue.service.js`,
   `knowledge.service.js`, `comment.service.js`, or
   `project.service.js` — they call the *new* `auth.service.js` (§7 of
   the original review draft) and read/write only the `User` collection
   plus whatever refresh-state store is chosen. They never touch the
   nine already-tested domain operations. That is the load-bearing fact
   that keeps this from being "the start of Routes": **a general Routes
   milestone is defined by wiring pre-existing domain services to HTTP.
   These five endpoints wire no domain service — they wire the
   authentication service the milestone itself is building.** The
   boundary isn't "is it an Express route," it's "which layer does the
   route sit in front of."
4. **Supporting decisions**: `server/README.md` already treats "Zod
   validation on all auth routes" as its own named gap, distinct from
   general route validation gaps — the project's own documentation
   already implicitly treats auth routes as a separate, first-class
   surface, not a subset of "routes" in general. ADR-0002's
   responsibility split assigns "authentication/authorization" to
   Express directly, as its own named responsibility, not folded into
   "core API."
5. **If deferred**: the milestone becomes untestable except via direct
   service-function calls in a test file — which is exactly Phase D's
   pattern, and Phase D's pattern is correct *for services*, but
   identity/session by definition includes a network-facing handshake
   (issuing/reading cookies) that cannot be exercised the same way.
   Deferring the API surface doesn't shrink the milestone, it just
   moves an unavoidable piece of it into a later milestone under a
   different name, which is worse for traceability, not better for
   scope discipline.

**Minimum endpoint set, restated:**

| Endpoint | Purpose |
|---|---|
| `POST /auth/register` | Create `User`, hash password, establish session |
| `POST /auth/login` | Verify credentials, establish session |
| `POST /auth/logout` | Invalidate session/refresh state |
| `GET /auth/me` | Resolve current session → `{ id, role }` or anonymous, for frontend use |
| `POST /auth/refresh` (or equivalent) | Rotate/renew access token from refresh cookie |

No CRUD, no pagination, no filtering, no domain payloads. Every one of
these endpoints' request/response bodies concerns only credentials,
tokens, and the caller's own identity.

---

## C. General application API/routes

Issue/Knowledge/Comment/Project routes; general controller layer wiring
the nine Phase D service operations to HTTP.

1. **Does not belong in this milestone.**
2. **Why**: this is the actual Routes milestone, deferred by the
   original sequencing decision (CLAUDE.md: "Routes/controllers would
   follow once Authentication produces a real `actorContext`"). Nothing
   in L1–L3 or in this scope analysis changes that — if anything, B's
   analysis sharpens *why* it's deferred: these routes need `actorContext`
   to already be producible before they can meaningfully call
   `changeStatus`, `createIssue`, etc. with a real actor instead of a
   fixture.
3. **Boundary crossed**: HTTP → already-existing, already-tested domain
   service. This is a different boundary than A/B — it's the one Phase D
   explicitly built `actorContext` as a stable contract to eventually
   receive across, but building the contract's producer (this milestone)
   is not the same task as building its consumers (Routes milestone).
4. **Supporting decisions**: Phase D's actor-context boundary language
   itself ("how actorContext was produced is entirely outside this
   module's concern") — that sentence only makes sense if production and
   consumption stay in different milestones; collapsing them here would
   make Phase D's own architectural statement retroactively pointless.
5. **If included now**: this is the actual risk worth naming plainly —
   see Risks below. Nothing here would become "awkward or incomplete" by
   deferring it; the whole point of the `actorContext` contract is that
   these routes can be built later with zero knowledge of how
   Authentication was implemented internally.

---

## Deliverable

### 1. Recommended Authentication milestone scope

Infrastructure (A) **and** the five-endpoint minimal auth API surface
(B). Nothing from C.

### 2. Minimal auth API decision

**Yes, these endpoints belong in the milestone.** Restated plainly: a
login system that cannot be logged into over HTTP is not a shippable
authentication milestone, it's a partially-built one. The five
endpoints in B are authentication infrastructure's own API, not the
first slice of the general Routes milestone, because they front the new
`auth.service.js` exclusively and never call any of the nine existing
domain service operations.

### 3. Explicit exclusions (deferred to a future Routes milestone)

- All Issue routes/controllers (`createIssue`, `changeStatus` wired to
  HTTP)
- All Knowledge routes/controllers (`createKnowledge`,
  `submitForReview`, `approve`, `reject`, `revise` wired to HTTP)
- All Comment routes/controllers (`createComment` wired to HTTP)
- All Project routes/controllers (`createProject` wired to HTTP)
- Any general-purpose request validation, pagination, or filtering
  middleware intended for reuse across domain routes (as opposed to
  auth-specific validation, which is in scope — see `server/README.md`'s
  existing "Zod validation on all auth routes" line item)
- Any API versioning scheme decision for the general API surface

### 4. File impact (categories only, not implemented here)

- `server/src/services/auth.service.js` — new
- `server/src/services/errors.js` — likely extended with auth-specific
  `DomainErrorCode` values (`INVALID_CREDENTIALS`,
  `EMAIL_ALREADY_REGISTERED`, etc.), not restructured
- `server/src/middleware/auth.js` (or similar) — new
- `server/src/routes/auth.routes.js` (or similar) — new, the five
  endpoints only
- `server/src/models/User.js` — possibly extended, pending the refresh-
  storage decision (still open — not resolved by this analysis)
- `server/src/app.js` — modified to mount the new auth router and
  (likely) a cookie-parsing middleware
- `server/src/validation/auth.validation.js` (or similar) — new Zod
  schemas for register/login payloads, following the existing
  `validation/*.validation.js` convention
- `server/tests/auth.service.test.js`, and likely a separate
  route-level test file, given that cookie issuance/reading is exactly
  the kind of behavior unit-testing the service function alone won't
  exercise
- **Not touched**: `issue.service.js`, `knowledge.service.js`,
  `comment.service.js`, `project.service.js`, and their corresponding
  models/validation files

### 5. Risks

- **Scope bleed into general routing infrastructure.** The clearest
  failure mode: while building `server/src/routes/auth.routes.js`,
  it's tempting to also stand up the *general* Express router
  structure, shared error-handling middleware for all future routes,
  or a generic request-validation wrapper "since we're setting up
  routing anyway." That generic infrastructure belongs to the Routes
  milestone, decided with its own review, not smuggled in as a
  side-effect of auth needing five endpoints.
- **Duplicating domain authorization in middleware.** Flagged already in
  the original review (§5) and worth repeating here specifically because
  Step 2 is exactly the kind of task that invites it: a middleware
  author building `GET /auth/me` might be tempted to also add
  role-based route guards (e.g. "EXPERT-only middleware") for future
  convenience. That authorization logic already lives in, and must stay
  in, the service layer (`authorizeTransition`, EXPERT-only checks in
  `knowledge.service.js`, etc.). Auth middleware's job stops at
  producing `actorContext`.
- **Changing existing service contracts.** None of the five auth
  endpoints have any reason to touch `issue.service.js`,
  `knowledge.service.js`, `comment.service.js`, or `project.service.js`.
  If implementation reveals a reason to change any of those files'
  signatures to "make auth integration easier," that is a signal the
  boundary is being violated, not a legitimate refactor — consistent
  with the original review's §7 conclusion.
- **Treating authentication as a reason to resolve D-3a.** Restated
  because it is the sharpest risk in the whole milestone, not because
  Step 2 introduces new exposure to it: none of the five endpoints in B
  have any legitimate reason to call `changeStatus()`. If a future PR
  introduces one — e.g., an admin endpoint to "manually resolve"
  issues — that is D-3a resolution wearing an authentication costume,
  and should be rejected on sight regardless of how it's framed.
- **The refresh endpoint's shape depends on an undecided storage
  question.** `POST /auth/refresh`'s implementation (what it reads, what
  it invalidates/rotates) cannot be fully specified until the
  User-field-vs-collection decision is made. This is not a reason to
  defer the endpoint from scope — it's confirmed in-scope above — but it
  does mean this endpoint specifically cannot be implemented yet, which
  is consistent with your instruction to resolve refresh-token storage
  before proceeding to implementation.

---

## Summary

Authentication milestone scope = **A (infrastructure) + B (five-endpoint
auth API)**. C (general domain routes) stays fully deferred. The
distinguishing test applied throughout: *does this endpoint call a
pre-existing domain service, or does it call the new auth service the
milestone itself produces?* B fails that test in the "safe" direction
(it never touches domain services) — which is exactly why it's in scope
without being the start of the Routes milestone.

No decisions promoted to `decision-register.md`. No code written.
Refresh-token storage remains the next decision to actually resolve
before any implementation begins.
