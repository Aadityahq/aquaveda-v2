# Authentication implementation plan

**Implementation Plan — derived from locked architecture decisions.**
Planning only. No code, models, services, routes, middleware, validation,
dependencies, or environment files are modified by this document. All
proposals below require review before any file is touched.

Sources reconciled: `docs/architecture/decision-register.md`
(Authentication section), `authentication-architecture-decision-report.md`,
`authentication-milestone-review-draft.md`,
`authentication-scope-boundary-analysis.md`,
`authentication-session-storage-design.md`, `docs/domain/domain-model.md`,
`docs/architecture/persistence-design.md`, `CLAUDE.md`, `server/README.md`,
and direct inspection of `server/src/{models,services,config,validation}`,
`server/src/{app,server}.js`, and `server/tests/`.

**One repository fact worth flagging up front, unrelated to this
milestone's scope**: `server/package.json` has a `"seed:users"` script
pointing at `src/seed/seedUsers.js`, which does not exist anywhere in the
repository. This plan does not touch or fix it — noted only so it isn't
mistaken for something this milestone was supposed to create.

---

## Phase A — Dependency and configuration foundation

### New dependencies proposed

| Package | Necessity | Why existing Node/Express can't reasonably substitute | Used in |
|---|---|---|---|
| `jsonwebtoken` | Required | Node's built-in `crypto` can do raw HMAC/RSA signing, but reimplementing JWT's encoding, claim validation, expiry checking, and algorithm-confusion protections by hand is exactly the kind of security-sensitive wheel-reinvention this project should not do. `jsonwebtoken` is the de facto standard, small, and has no transitive dependency bloat concern. | Token signing/verification utilities (Phase D) |
| `cookie-parser` | Required | Express does not parse cookies out of the box — `req.cookies` does not exist without it. Given L2 (cookies are the *only* auth transport), this is not optional convenience, it's the mechanism by which every authenticated request becomes readable at all. | `app.js` (global middleware), auth middleware (Phase E) |
| `cors` | Required | L1 (Topology B) means the browser and API are on different origins/deployments. A credentialed cross-origin request (`credentials: 'include'`, required for cookies to be sent cross-origin) needs the server to echo back a specific `Access-Control-Allow-Origin` (not `*`) and set `Access-Control-Allow-Credentials: true`. Hand-rolling this is a well-known source of CORS misconfiguration bugs; `cors` is a thin, widely-used middleware that gets the specific-origin-plus-credentials case right. Note: `server/README.md` already reserves `ALLOWED_ORIGINS` in the env block for exactly this — this dependency is filling an already-anticipated gap, not introducing a new concept. |
| bcrypt algorithm — **name TBD, flagged for review, see below** | Required | Password hashing needs an adaptive, slow, salted hash (bcrypt/scrypt/argon2 family) — `crypto`'s built-in `scrypt` function exists and is a legitimate option, avoiding a dependency entirely. Flagged as a genuine open choice, not decided here. | Password hashing utility (Phase D) |

### Password-hashing library — explicit sub-choice, not decided here

Two real options, both defensible:

1. **`node:crypto`'s built-in `scrypt`** — zero new dependencies. Requires
   writing a small wrapper (generate salt, derive key, encode/decode a
   combined stored string, timing-safe comparison via
   `crypto.timingSafeEqual`). This is a well-trodden pattern, not a novel
   cryptographic design — Node's own documentation includes a password-
   hashing example using exactly this approach.
2. **`bcrypt`** (native, requires a build toolchain) or **`bcryptjs`**
   (pure JS, slower, no native compile step) — a dedicated library
   encoding the salt/cost-factor/algorithm-version into one stored
   string, which is a marginally more standard format if this project
   ever needs to interoperate with tooling that expects bcrypt hashes
   specifically.

**Recommendation for review**: `node:crypto`'s `scrypt`, avoiding a new
dependency entirely for a task Node's standard library already covers
correctly. This is the option most consistent with the project's
existing "every dependency must earn its place through a concrete
current requirement" policy (from the original context-transfer
document) and avoids the native-bcrypt Windows build-toolchain friction
that would otherwise need investigating for this specific development
environment. If review prefers `bcrypt`/`bcryptjs` for interoperability
reasons, that's a reasonable alternative — flagging as needing an
explicit answer, not silently picking one.

### Refresh-token hashing — explicitly NOT the same mechanism as password hashing

Worth stating as its own point because conflating the two would be a
real design mistake: a refresh token is a high-entropy random value
(effectively unguessable), not a low-entropy human-chosen password.
Hashing it with a deliberately *slow* adaptive hash (bcrypt/scrypt) adds
CPU cost on every single refresh request for no security benefit — the
threat scrypt/bcrypt defends against (offline dictionary/brute-force
attacks against a *guessable* secret) doesn't apply to a random token.
**Recommendation**: hash refresh tokens with `crypto.createHash("sha256")`
— a fast, deterministic, collision-resistant hash, appropriate for
looking up and comparing a high-entropy value, with zero new
dependencies. This is standard practice for refresh-token-at-rest
storage (compare: hashed session cookies, hashed API keys) and distinct
from password storage on purpose.

### Explicitly not proposed for this milestone

- `express-session` — this project's design is two explicit JWTs in
  cookies, not `express-session`'s server-side-session-plus-signed-
  cookie-id pattern. Adding it would introduce a second, competing
  session concept. Do not add it.
- `helmet` — general HTTP-hardening middleware, not specific to
  authentication. No locked decision requires it for this milestone;
  flagged as a candidate for a future, separately-justified security
  pass, not this one.
- `passport` (or any strategy-based auth framework) — this milestone's
  entire scope is one credential type (email+password) and one token
  transport (HttpOnly cookies). A strategy framework solves a problem
  (many auth providers, pluggable strategies) this project doesn't have
  yet, and L3's proportionality principle argues directly against
  adopting the heavier abstraction pre-emptively.

### Candidate, not yet proposed — flagged as a genuine open question

**`express-rate-limit`** on the auth router specifically. `server/
README.md`'s env block already reserves `AUTH_RATE_LIMIT_WINDOW_MS` and
`AUTH_RATE_LIMIT_MAX`, meaning this was anticipated before this
milestone started, and brute-force login protection is squarely a
"common attack" L3 says to defend against proportionately. This is a
small, focused dependency (one middleware, applied only to
`/auth/login` and `/auth/register`), not general infrastructure.
**Recommendation**: include it, scoped only to the auth router — but
flagging explicitly for confirmation since it's a new dependency and
the instructions ask to avoid dependency accumulation for its own sake.
If not confirmed, login/register ship without rate limiting for this
milestone and it becomes a fast-follow.

### Environment variables required (extending the existing block)

`server/README.md`'s current block already has:
```
JWT_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
```

**Proposed change, flagged for review, not applied here**: split
`JWT_SECRET` into two — `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
Rationale: access and refresh tokens have different payload shapes
(L16) and different blast radii if leaked (a leaked access secret lets
an attacker mint valid identity claims for 15 minutes; a leaked refresh
secret is far more serious). Separate secrets mean a refresh token can
never be replayed as if it were an access token (or vice versa) even by
accident, and mean the two secrets can be rotated independently later.
This is a small, low-cost hardening step consistent with L3
("reasonable... standard protections against common mistakes"), not
heavyweight ceremony. If review prefers a single shared secret for
simplicity, `JWT_SECRET` stays as-is — flagging the trade-off rather
than deciding it unilaterally.

No other new env vars are required — `MONGO_URI`, `TEST_MONGO_URI`,
`ALLOWED_ORIGINS`, and the two rate-limit vars already cover what this
milestone needs.

### Secrets/lifetime configuration mechanism (corrected)

**Earlier version of this plan was wrong to treat "importing `db.js`
transitively loads dotenv" as the general configuration mechanism for
authentication code.** That's an accident of `db.js`'s own needs, not a
designed configuration boundary — it would leave `auth-tokens.js`
reading `process.env.JWT_ACCESS_SECRET` only because some *other*,
functionally unrelated module happens to import `dotenv/config` as a
side effect. That's a hidden coupling, not an intentional one, and this
project has already been burned once by exactly this class of problem
(the earlier `dotenv`-only-in-`server.js` bug this project already
fixed once).

**Corrected approach: a small dedicated configuration module,
`server/src/config/env.js`** (sibling to the existing `db.js`, not a
replacement for it). Responsibilities:

- Owns the single `import "dotenv/config"` call for the whole
  application — this becomes the actual, intentional configuration
  entry point, not `db.js`'s side effect.
- Reads and validates the specific env vars this milestone needs
  (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` or `JWT_SECRET`,
  `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, and later
  `COOKIE_SAME_SITE`/`COOKIE_DOMAIN` from Phase H), throwing a clear
  startup error via the same `getRequiredEnv`-style pattern `db.js`
  already established, rather than each consumer independently
  deciding how to handle a missing var.
- Exports named, already-validated values (e.g. `export const
  jwtAccessSecret = ...`), not a raw `process.env` passthrough — so
  `auth-tokens.js` imports *this* module, not `process.env` directly
  and not `db.js`.
- `db.js` is updated to import `env.js` too (for `MONGO_URI`/
  `TEST_MONGO_URI`), rather than independently calling
  `dotenv/config` itself — collapsing to one real entry point instead
  of two modules each assuming they're the loader. **This is a small,
  mechanical refactor of `db.js`'s existing `import "dotenv/config"`
  line, not a reopening of its connection logic or its `{ envVar }`
  parameter design**, both of which stay exactly as they are.

This does not become a general application-wide settings framework —
it's one file, validating the handful of vars this project actually
uses, following the same minimal-and-earned-complexity principle as
everything else in this plan. It exists specifically so no future
module has to "happen to" get its configuration from an unrelated
import, the same failure class already fixed once for `dotenv` loading
generally.

**Test-suite implication**: `tests/helpers/testDb.js` already imports
`db.js` for `connectDB`; once `db.js` imports `env.js` instead of
calling `dotenv/config` directly, the test suite's env loading keeps
working through the same chain, just with one more (thin) link — no
change to `testDb.js` itself is required.

---

## Phase B — Session persistence model

### Proposed file: `server/src/models/Session.js`

Mirrors the existing model-file conventions (`Issue.js`, `User.js`):
schema-enforceable constraints documented in a header comment, explicit
statement of what's *not* enforced at this layer, `timestamps: true`
where useful (`createdAt` doubles as issued-at; not that
`Session` needs `updatedAt` for anything, but consistency with existing
models' convention is worth preserving unless there's a reason not to
— flagged for review, not a strong requirement).

Fields:

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId (default) | This **is** the `sid` referenced in the refresh JWT payload (L15/L16) — no separate `sid` field needed, Mongoose's default `_id` serves this purpose directly. |
| `userId` | ObjectId, ref `User`, required | Indexed (see below). Verified to match the JWT's `sub` claim at refresh time — a `sid` resolving to a `Session` whose `userId` doesn't match the token's `sub` is itself a rejection case (Phase I). |
| `tokenHash` | String, required, **`select: false`** (locked as an implementation requirement, not a recommendation — see below) | SHA-256 hash of the raw refresh token (see Phase A). Never the raw token. |
| `expiresAt` | Date, required | TTL-indexed (see below). Must equal `JWT_REFRESH_EXPIRES`'s lifetime from issuance, kept in sync by the service layer at creation/rotation time — not derived redundantly from the JWT itself. |
| `createdAt` | Date (via `timestamps: true`) | Issued-at bookkeeping; no behavior depends on it in this milestone. |

**`tokenHash: select: false` is locked at implementation level, not
left as a recommendation** — it follows `User.passwordHash`'s existing
defense-in-depth pattern exactly, at negligible cost: normal `Session`
queries (e.g. any future "list sessions" read) never need it by
default, and the refresh flow can still filter *by* `tokenHash` in a
query condition (Mongoose's `select: false` excludes a field from what
comes back in a result document, it does not prevent using that field
in a query's filter) — so this has no effect on the corrected atomic
`findOneAndDelete` consume mechanism in Phase C, which filters on
`tokenHash` without ever needing it returned.

Indexes:
- `{ userId: 1 }` — supports any future "list a user's sessions" or
  "invalidate all sessions for a user" operation (not built this
  milestone, but the index costs nothing to add now and is a natural
  companion to `userId` existing at all).
- `{ expiresAt: 1 }` with `{ expires: 0 }` (a genuine **MongoDB TTL
  index**, not just an ordinary index) — handles physical document
  cleanup automatically. Exact syntax to confirm at implementation time:
  ```js
  sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  ```
  (Mongoose/MongoDB TTL indexes delete a document `expireAfterSeconds`
  after the value stored in the indexed date field — `0` means "at the
  stored `expiresAt` time itself," which is the correct semantics here
  since `expiresAt` is already an absolute expiry timestamp, not a
  relative duration.)

**Locked rule, restated as an explicit implementation constraint (not
new — L13):** the TTL index above handles eventual cleanup only.
MongoDB's TTL background monitor runs periodically (roughly every 60
seconds, not instantaneously), so a `Session` document can be
logically expired but still physically present in the collection for
some window after its `expiresAt` has passed. **Every service-layer
read of a `Session` during refresh must independently check
`session.expiresAt > new Date()` and treat an expired-but-not-yet-swept
document as invalid**, exactly as if it didn't exist. This check cannot
be delegated to the index.

### Relationship to `User`

Reference-only (`userId: ObjectId ref User`), consistent with every
other cross-collection reference in this project (`Issue.reportedBy`,
`Project.originIssue`, etc.). No changes to `User.js` — confirmed
against L8 (dedicated collection, not an embedded field).

### Verification tooling to extend

`server/scripts/verify-models.js` currently checks the five Phase D
models offline (schema introspection, `validateSync()`, no DB
connection). It should be extended with a **1f. Session model compiles**
check and **2f. Session has userId/expiresAt indexes** check, following
the exact existing pattern (`check("label", () => { ... })`). This is a
mechanical extension of existing tooling, not a new testing philosophy
— flagged as an implementation step (Phase A of the sequence in §5
below), not decided further here.

---

## Phase C — Authentication service layer

Proposed file: `server/src/services/auth.service.js`. Follows Phase D's
established conventions exactly: functions take/produce plain data,
never Express `req`/`res`; errors are `DomainError` instances via the
existing `errors.js` contract (extended per Phase I); Mongoose
`ValidationError`/`CastError` translated via the same
`wrapMongooseValidationError` pattern already present in every other
service file (likely duplicated into this file the same way each
existing service file has its own local copy, unless review prefers
extracting it to a shared helper now that a fourth copy would exist —
**flagged as a small refactor question, not decided here**).

### Operation matrix

| Operation | Reads | Writes | Domain Rules | Atomicity | Output |
|---|---|---|---|---|---|
| `register(payload)` | `User.findOne({ email })` (duplicate check) | `User.create(...)`, `Session.create(...)` | Email uniqueness (service-level check **and** schema-level unique index as backstop — see below); password hashing before storage; role always defaults to `USER` (never accepted from payload — mirrors `createIssue` never accepting `status` from the caller) | Single-document creates; no cross-document atomicity concern. Duplicate-email race (two concurrent registrations, same email) is caught by the **schema's unique index** raising a Mongo duplicate-key error if the service-level `findOne` check loses a race — translated to a `DomainError` (Phase I), not left as a raw Mongo error. | `{ user: {id, name, email, role}, accessToken, refreshToken }` — service returns raw tokens; cookie-setting is the route layer's job (Phase F), not the service's, keeping `auth.service.js` HTTP-agnostic like every other service file. |
| `login(payload)` | `User.findOne({ email }).select("+passwordHash")` | `Session.create(...)` | Password verification (constant-time comparison, per the hashing utility's own contract); **generic failure message regardless of whether the email exists or the password was wrong** (Phase I) | Single-document create; no atomicity concern | Same shape as `register` |
| `refresh(refreshToken)` | Verify JWT signature/expiry → extract `{ sub, sid }` → `Session.findById(sid)` | Delete old `Session`, create new `Session` (see rotation mechanism below) | `session.userId === sub` (mismatch is a rejection, not a silent correction); `session.expiresAt > now` (L13, independent of TTL); single-use enforcement (L14a) | **This is the operation requiring the conditional-atomic-update pattern** — see dedicated analysis below | New `{ accessToken, refreshToken }` pair |
| `logout(sid)` | none (no need to read before deleting) | `Session.deleteOne({ _id: sid })` | None beyond "the session no longer exists afterward, whether or not it existed before" — logout is idempotent by design (calling it twice, or on an already-expired session, isn't an error) | Single-document delete, no race to guard against — deleting an already-deleted or nonexistent document is a no-op, not a conflict | `{ success: true }` (no meaningful body needed) |

**Correction — no `resolveActor` operation in `auth.service.js`.** An
earlier draft of this plan listed a `resolveActor(accessToken)` service
function and left `/me` ambiguously choosing between calling it or
reading `req.actorContext` directly. That ambiguity is removed: **actor
resolution from a request is exclusively the auth middleware's
responsibility (Phase E), not something `auth.service.js` also
performs as a second, parallel pipeline.** The middleware's own
internal steps (verify access JWT → load `User` → resolve fresh role →
build `{ id, role }`) may reuse the same small helper functions from
`auth-tokens.js` that `login`/`refresh` also use for token verification
— that's normal code reuse at the utility level — but there is no
second, independently-invokable "resolve the current request's actor"
entry point in the service layer. `/me` (Phase F) simply reads
`req.actorContext`, already populated by the middleware that ran before
it, exactly like every other route would. This removes the drift risk
of middleware and `/me` each implementing actor resolution slightly
differently over time.

### Registration — detail

- Password hashing happens **inside** `auth.service.js`, calling the
  Phase D hashing utility — never in the route layer, never in the
  model (consistent with `User.js`'s own header comment: "NOT enforced
  here (service-layer / Authentication milestone): how a password is
  hashed").
- `User` fields created: `name`, `email` (lowercased/trimmed by the
  schema automatically), `passwordHash` (never raw password), `role`
  defaulting to `"USER"` via the schema default — the service should
  not pass `role` at all, the same way `createIssue` never passes
  `status`.
- **Registration does immediately create a session** (auto-login on
  register) — this matches the operation matrix above and is the
  simpler, lower-friction UX choice consistent with L3, but is
  explicitly flagged here as a product-shape decision, not purely an
  architecture one. If a "must verify email before first login" flow is
  ever wanted, that would reopen this — not required by anything
  currently locked, and out of scope to invent now (no email-sending
  infrastructure exists, and building one wasn't asked for).

### Login — detail

- Password verification uses the hashing utility's own comparison
  function (Phase D), never a manual `===` on hashes (timing-attack
  surface).
- On success: create a `Session`, sign an access JWT (`{ sub }`) and a
  refresh JWT (`{ sub, sid }` where `sid` is the new `Session`'s `_id`).
- **Failure message must not distinguish "email not found" from
  "password wrong"** — both collapse to the same generic error (Phase I
  detail), addressing the exact information-leak pattern the
  instructions call out explicitly.

### Refresh — single-use enforcement mechanism (corrected)

**Required mechanism: atomic conditional consume via a single
`findOneAndDelete`, not a separate read followed by a separate delete.**
The two-step read-then-delete version considered earlier is rejected —
not merely deprioritized — because it opens a real (if narrow) failure
window: if the old session is deleted first and the replacement-session
creation fails afterward, the user loses their session entirely for a
reason that has nothing to do with concurrency. Collapsing consumption
into one atomic operation removes that window and is the correct
default, not an optional micro-optimization.

```
1. Verify refresh JWT → { sub, sid }
2. consumed = await Session.findOneAndDelete({
     _id: sid,
     userId: sub,
     tokenHash: hashRefreshToken(rawRefreshToken),
     expiresAt: { $gt: new Date() },   // L13's independent check,
                                        // expressed as a query condition
                                        // rather than a separate read
   })
   - consumed === null → reject. This single condition already covers
     every rejection case that matters (wrong/missing sid, wrong user,
     tampered/mismatched token, expired session, already-consumed by a
     concurrent request) — see the note below on whether to preserve
     distinct error codes for these.
   - consumed !== null → this request legitimately won any race.
     Proceed to step 3.
3. Create a new Session, sign a new token pair, return it.
```

**The locked guarantee, restated precisely**: exactly one concurrent
request may consume a given old refresh credential — `findOneAndDelete`
with this filter is atomic at the MongoDB level, so under two
simultaneous requests racing the same `sid`/`tokenHash`, MongoDB
guarantees only one of them observes a non-null `consumed` result; the
other necessarily observes `null`. This is the same class of guarantee
`issue.service.js`'s conditional `findOneAndUpdate` already relies on
(atomicity from the database, not application-level locking) — reused
here rather than invented, satisfying the instruction to reuse Phase D's
pattern.

**What happens if step 3 (creating the replacement) fails after a
successful consume in step 2** is an explicitly separate, accepted
failure mode, not a case this mechanism needs to protect against: the
old session is correctly gone (single-use is upheld), and the user
simply needs to log in again. Per the project's own proportionate
security/complexity posture, this does not justify wrapping steps 2–3 in
a transaction — consistent with Phase D's existing "no multi-document
transactions" decision, which was reached for the same class of reason
(embedded history + reference-only relationships mean the atomicity that
actually matters is scoped to a single conditional operation, not a
multi-step saga).

**One consequence worth flagging explicitly**: folding wrong-user,
expired, and already-consumed into a single query condition means the
service can no longer distinguish "expired" from "already consumed by
someone else" from "wrong user" purely from the `findOneAndDelete`
result — all three collapse to the same `null`. Phase I's proposed
`SESSION_EXPIRED` vs. `SESSION_REUSE_DETECTED` distinction (both
proposed as separate codes) is **no longer directly achievable from this
single atomic query alone** without an extra, non-atomic follow-up read
purely for error-message quality (which would reintroduce exactly the
race window this correction removes, just for diagnostic purposes
instead of correctness ones). **Flagged as a genuine trade-off for
review, not resolved here**: either (a) collapse both proposed codes
into one generic `INVALID_CREDENTIALS`-style refresh-failure code,
accepting a less specific client-facing message, or (b) accept a
best-effort, non-atomic diagnostic read *after* the atomic consume
fails, purely to decide which error code to report, understood to be
advisory only (it reads state that may have already changed again by
the time it runs) and never used for the actual authorization decision.
Recommendation: **(a)** — a single `REFRESH_FAILED`-style code is
simpler, doesn't need a second DB read on the failure path, and a
generic "please log in again" message loses nothing a normal user needs
to know. This replaces the two separately-proposed codes in Phase I
below; see the updated Phase I section.

### Logout — detail

Per L17, logout's job is **only** to delete the current `Session`
document (identified by `sid`, extracted from the refresh cookie —
Phase F). It does not, and per L17 must not attempt to, invalidate the
current access token. **No JWT blacklist, denylist, or revocation-list
mechanism is being designed here** — flagging explicitly per the
instruction not to accidentally design one. If a future milestone
decides instant access-token revocation is a real requirement, that
would need its own explicit review (it would mean adding exactly the
per-request session lookup L16 rejected for the access-token path) —
not something to build speculatively now.

---

## Phase D — Token and credential utilities

Proposed file: `server/src/services/auth-tokens.js` (or
`server/src/utils/tokens.js` — naming flagged for review; the former
keeps it alongside `auth.service.js` as a clearly-related pair, the
latter matches a more generic "utils" convention this project hasn't
established elsewhere, so **recommendation: `auth-tokens.js` inside
`services/`**, avoiding introducing a new top-level directory
(`utils/`) for a single file).

Responsibilities, kept strictly separate as named functions (not a
class, consistent with this project's function-oriented service style):

| Function | Responsibility |
|---|---|
| `hashPassword(plaintext)` | Wraps the chosen hashing mechanism (Phase A) |
| `verifyPassword(plaintext, hash)` | Constant-time comparison |
| `signAccessToken({ sub })` | Signs `{ sub }` only, using `JWT_ACCESS_SECRET` (or `JWT_SECRET` if the single-secret option is chosen — Phase A) and `JWT_ACCESS_EXPIRES` |
| `signRefreshToken({ sub, sid })` | Signs `{ sub, sid }`, using `JWT_REFRESH_SECRET` (or shared secret) and `JWT_REFRESH_EXPIRES` |
| `verifyAccessToken(token)` | Verifies signature + expiry, returns `{ sub }` or throws |
| `verifyRefreshToken(token)` | Verifies signature + expiry, returns `{ sub, sid }` or throws |
| `hashRefreshToken(rawToken)` | SHA-256, for persistence in `Session.tokenHash` |
| `generateRefreshTokenSecretMaterial()` | **Only needed if the refresh "token" the browser holds is a separate opaque random value from the signed JWT** — see open question below. If the refresh JWT itself is what's stored (hashed) in `Session.tokenHash`, this function isn't needed at all and the refresh JWT's own signature does double duty as the credential. **Flagged as a genuine open implementation question**, not resolved here: hashing and storing the *entire signed refresh JWT* string is simpler (fewer moving parts, `sid` is already inside the payload so no separate correlation is needed) and is the recommended default; a separate opaque secret is only worth the extra complexity if there's a reason not to store a hash of the JWT itself, which nothing in this milestone's requirements currently demands. |

**Payload shape restated for clarity, exactly per L10/L16:**
- Access: `{ sub: userId }` — no `role`, no `sid`.
- Refresh: `{ sub: userId, sid: sessionId }` — no `role`.

No password reset token generation, no email-verification token
generation — both explicitly out of scope (decision-register.md
"Deferred", restated in the architecture decision report §2/§8).

---

## Phase E — Authentication middleware

Proposed file: `server/src/middleware/auth.js`.

**This middleware is the sole, exclusive owner of request-actor
resolution** (correction applied — see the note under the Phase C
operation matrix). No other file, including `auth.service.js`,
independently resolves an actor from a token. Any route needing to know
who's making the request reads `req.actorContext`, set here.

Plan:

1. **Cookie extraction**: read the access-token cookie via
   `req.cookies` (populated by the globally-mounted `cookie-parser`
   middleware from Phase A). Cookie name TBD at implementation
   (`access_token` / `at` — small naming choice, not architectural).
2. **Missing cookie handling**: if absent, do **not** immediately
   reject the request. Per Product Invariant 5 (anonymous browsing must
   keep working) and the original review's §4, this middleware
   populates `req.actorContext = null` and lets each route decide
   whether it requires one — mirroring how every Phase D service
   already throws its own `UNAUTHORIZED` via `requireActor()` when
   given a null/missing actor. The middleware does not duplicate that
   check; it only makes the actor available (or explicitly absent) for
   whatever consumes it next.
3. **Access JWT verification**: call `verifyAccessToken()` (Phase D).
   Malformed or expired tokens are treated as "no valid actor" — for a
   middleware that's advisory-until-consumed (per point 2), this means
   the same `req.actorContext = null` outcome, not a hard 401 at the
   middleware layer itself. (A route that *requires* auth will surface
   the missing-actor case as an error — Phase F/I — the middleware's
   job stops at "did I get a trustworthy identity or not.")
4. **User lookup for fresh role resolution (L11)**: on successful
   verification, `User.findById(sub)`. If the user no longer exists
   (deleted between token issuance and this request), treat exactly
   like an invalid token — `actorContext = null`. This is the concrete
   mechanism correcting V1's specific defect.
5. **`actorContext` construction**: `{ id: user._id, role: user.role }`
   — the exact shape every Phase D service already destructures. No
   extra fields, no `email`/`name` bundled in "for convenience" (keeps
   the contract identical to what's already tested and consumed).
6. **Request attachment**: `req.actorContext = ...` (or `null`).
   Plain property assignment on the Express request object — the
   established, unremarkable Express convention for this kind of
   per-request context, nothing bespoke needed.

**Explicit D-3a verification for this phase**: this middleware has
*zero* awareness of Issue status, lifecycle, or the
`AUTHORIZATION_POLICY_UNRESOLVED` error code. It produces `{ id, role }`
and stops. The two D-3a-gated transitions
(`acknowledged → in_progress`, `in_progress → resolved`) continue to be
evaluated exclusively inside `issue.service.js`'s `authorizeTransition()`,
completely untouched by this middleware's existence. A `role: "EXPERT"`
now being *reliably* resolvable does not change what `authorizeTransition()`
does with that role for those two specific transitions — it still throws
`AUTHORIZATION_POLICY_UNRESOLVED` unconditionally, for every role,
exactly as today. This middleware makes real roles *available*; it does
not make D-3a's transitions newly permitted.

---

## Phase F — Authentication routes

Proposed file: `server/src/routes/auth.routes.js`, mounted in `app.js`
at `/api/v1/auth` (matching the existing `/api/v1/health` prefix
convention already in `app.js`).

| Route | Method | Validation | Service | Cookie behavior | Response behavior |
|---|---|---|---|---|---|
| `/api/v1/auth/register` | POST | `registerSchema` (Phase G) | `auth.service.register()` | Sets both access + refresh cookies on success | 201, `{ user }` (never the raw tokens in the body — they live only in cookies, per L2) |
| `/api/v1/auth/login` | POST | `loginSchema` (Phase G) | `auth.service.login()` | Sets both cookies on success | 200, `{ user }` |
| `/api/v1/auth/logout` | POST | none (no body) | `auth.service.logout(sid)` — `sid` read from the refresh cookie, not the request body | Clears both cookies (sets them expired/empty) regardless of whether a valid session was found — logout should never fail visibly to the client for "there was nothing to log out of" | 200, `{ success: true }` |
| `/api/v1/auth/me` | GET | none | none — reads `req.actorContext` only, already populated by the auth middleware; no service call on this route at all | none (read-only) | 200 with `{ user }` if authenticated, or 200 with `{ user: null }` for anonymous (not a 401 — "am I logged in" is itself a valid anonymous-accessible question, consistent with Invariant 5) |
| `/api/v1/auth/refresh` | POST | none (no body — `sid`/`sub` come from the refresh cookie itself) | `auth.service.refresh()` | Sets new access + refresh cookies (rotation, L14) on success; clears both on failure | 200, `{ user }` on success; error per Phase I on failure |

**Self-contained router, explicitly verified**: none of these five
handlers import or call `issue.service.js`, `knowledge.service.js`,
`comment.service.js`, or `project.service.js`. This is the concrete,
checkable form of L5's scope-boundary test — reviewable by grepping the
finished file's imports, not just asserted in prose.

**Not built in this phase**: any generic request-logging middleware,
generic response-envelope helper, or generic router-mounting scaffold
intended for future domain routes. `auth.routes.js` is mounted directly
in `app.js` the same unremarkable way `/api/v1/health` already is — no
new generic "router registry" pattern is introduced for this milestone
to hang off of later.

---

## Phase G — Validation

Proposed file: `server/src/validation/auth.validation.js`, following
the exact existing convention (`issue.validation.js` etc. — Zod schemas
exported by name, header comment stating what Zod does and doesn't own
here).

| Schema | Fields | Transport-layer concern | NOT this layer's job |
|---|---|---|---|
| `registerSchema` | `name` (non-empty trimmed string), `email` (valid email format, will be lowercased by the schema layer downstream — Zod can also `.toLowerCase()` here for early rejection consistency, flagged as a minor implementation choice), `password` (see constraints below) | Shape/format only | Uniqueness (service+DB layer), hashing (service layer) |
| `loginSchema` | `email`, `password` | Shape only — deliberately does **not** validate password complexity here (a login attempt with a "weak-looking" password must still be checked against the stored hash, not rejected at the validation layer for looking wrong) | Credential correctness (service layer) |

**Password constraints — resolved per review, locked as an
implementation requirement, not left open:**

- Minimum length: **8 characters**.
- Maximum length: a reasonable upper bound (e.g. 128 characters) purely
  to prevent pathological input, not a security control.
- **No composition rules** (no mandatory uppercase/lowercase/symbol/
  digit requirements). This is a deliberate choice, not an omission —
  composition rules are widely considered outdated guidance that pushes
  users toward predictable, easily-guessed patterns (e.g. `Password1!`)
  without meaningfully raising resistance to real attacks, and adds
  friction disproportionate to AquaVeda's threat model per the locked
  security posture (L3).
- **Phase G's `registerSchema` implementation may proceed directly with
  this rule** — this is no longer a blocking open question.

**Refresh has no request-body validation surface** — restated from the
route table: `sid`/`sub` are derived entirely from the refresh cookie,
never from a JSON body, so there's no payload for Zod to validate on
that route. This is worth stating explicitly since Zod schemas exist
for every other mutating route in this project and their absence here
could otherwise look like an oversight rather than a deliberate
consequence of the cookie-only design.

**No duplication across layers without purpose**: `email` uniqueness is
enforced at two layers on purpose (service-level `findOne` check for a
fast, friendly error path; schema-level unique index as the actual race-
safe backstop) — this is the same defense-in-depth pattern already
present in `User.js`'s existing unique index, not new duplication
introduced by this plan. Password *format* is validated only at Zod
(Phase G); password *correctness* is checked only at the service layer
(Phase C) — these are different concerns, not the same rule checked
twice.

---

## Phase H — Cookie configuration

Restated precisely per the locked/deployment-dependent split
(`decision-register.md`, L2/L2a):

**Locked, applies regardless of deployment target:**
- `HttpOnly: true` — every auth cookie, no exceptions.
- `Secure: true` — in production. (In local development over plain
  HTTP, `Secure: true` would prevent the cookie from being set at all —
  the implementation must key this off `NODE_ENV`/an equivalent
  environment signal, not hardcode `true` unconditionally. This is an
  implementation necessity following directly from the locked
  requirement, not a weakening of it.)

**Deployment-dependent, deliberately left unresolved here:**
- `SameSite` — **not** assumed to be `None` merely because Topology B
  separates frontend and backend. Depends on the actual registrable-
  domain relationship between the chosen hosting targets: sibling
  subdomains under one parent domain → `SameSite=Lax` is correct and
  simpler; genuinely different registrable domains → `SameSite=None`
  (which mandatorily requires `Secure: true`, already locked above
  regardless). **This cannot be finalized until actual hosting targets
  are chosen** — implementation should read this from an environment
  variable (e.g. `COOKIE_SAME_SITE`) rather than hardcoding either
  value, so the decision can be made at deploy-configuration time
  without a code change.
- `Domain` — similarly deployment-target-dependent; likely also an env
  var (`COOKIE_DOMAIN`) rather than a hardcoded value, left unset
  (defaults to the request's own host) unless cross-subdomain sharing
  is actually needed.
- `Path` — smaller decision: `/` (sent on every request) vs.
  `/api/v1/auth` (scoped narrowly to just the auth routes, including
  the refresh endpoint that actually needs the refresh cookie). Since
  the access-token cookie needs to accompany *every* authenticated
  request (not just auth routes), it should be `Path: "/"`. The refresh
  cookie, however, is only ever read by `/api/v1/auth/refresh` and
  `/api/v1/auth/logout` — scoping it to `Path: "/api/v1/auth"` is a
  reasonable minor hardening (the browser simply won't attach it to
  unrelated requests) and doesn't need to wait for deployment targets
  to be decided. **Recommendation: lock this one now** as an
  implementation detail, distinct from `SameSite`/`Domain` which
  genuinely need deployment information.

---

## Phase I — Error mapping (corrected)

Extends `server/src/services/errors.js`'s existing `DomainErrorCode`
enum (one class, one `code` field — no new hierarchy, per the file's
own stated philosophy) with a **minimal, explicitly-proposed** set —
revised down from the original three-code proposal, per the Phase C
correction above (the atomic `findOneAndDelete` consume can no longer
distinguish expired/wrong-user/already-consumed from each other, so
splitting them into separate codes is no longer honest about what the
implementation can actually tell):

| Proposed code | Used for |
|---|---|
| `INVALID_CREDENTIALS` | Login failure — **covers both** "email not found" and "password wrong" under one identical code and message, specifically so the response never discloses which one occurred (see below). |
| `REFRESH_FAILED` | **Replaces the earlier separately-proposed `SESSION_EXPIRED` and `SESSION_REUSE_DETECTED`.** Covers every way a refresh attempt can fail to produce a new token pair: malformed/tampered refresh JWT, expired refresh JWT, session not found, session expired (L13), wrong-user mismatch, and already-consumed (race/replay). All of these collapse to the same atomic `findOneAndDelete` returning `null` (Phase C), so they collapse to the same error code and the same generic "please log in again" client message — there is no honest way to report a more specific reason without a second, non-atomic, purely-diagnostic read that this plan explicitly declines to add (see Phase C). |

**Explicitly NOT proposed as new codes** — reuse existing ones instead:
- "Email already registered" → reuse `VALIDATION_FAILED` (it's a
  request-shape/business-input problem, not a new category) — flagged
  as a judgment call for review; a dedicated
  `EMAIL_ALREADY_REGISTERED` code is also reasonable if review prefers
  a more specific signal for the frontend to key off of. **Flagging
  both options rather than deciding unilaterally.**
- "Missing authentication" (no cookie at all, on a route that requires
  one) → reuse the existing `UNAUTHORIZED` code exactly as Phase D
  already defines it ("actor identity/role does not permit this
  action" — a missing actor is the base case of this). No new code
  needed; this is precisely what `UNAUTHORIZED` already means.
- "Expired access token" on a protected route → also collapses to the
  existing `UNAUTHORIZED` from the route's perspective — the middleware
  (Phase E) already treats an expired/invalid access token identically
  to a missing one (`actorContext = null`), so by the time a route
  checks for an actor and doesn't find one, there's no remaining
  distinction to preserve at the error-code level.

### Information-leak prevention (explicit, per the instructions)

`login`'s failure path must produce **one identical `DomainError`
(`INVALID_CREDENTIALS`) with one identical message**, regardless of
whether the email lookup failed or the password comparison failed —
implemented by structuring the service function so both failure paths
converge to the same `throw` before returning, never emitting a
distinguishable error for "email not found" specifically. This is a
concrete implementation constraint carried from L3's proportionate-
security posture, not a new decision. The same principle now extends to
`refresh` per the correction above: `REFRESH_FAILED` reveals nothing
about *why* a refresh failed, which is consistent, not an accidental
side effect of the atomicity fix.

---

## Phase J — Testing strategy

Follows Phase D's existing test conventions exactly:
`server/tests/auth.service.test.js` (service-level, using the existing
`tests/helpers/testDb.js` against `TEST_MONGO_URI`), likely a second
file `server/tests/auth.routes.test.js` for route/cookie-level behavior
that a pure service-unit test can't exercise (issuing a request and
reading `Set-Cookie` headers back).

### Service/unit tests
- Registration: creates a `User` with a hashed (never plaintext)
  password; defaults `role` to `USER` regardless of payload; rejects a
  duplicate email (both the fast `findOne`-check path and, as a
  separate test, the DB-unique-index race path).
- Login: succeeds with correct credentials; fails identically
  (`INVALID_CREDENTIALS`) for a wrong password and for a nonexistent
  email — asserting the messages are byte-for-byte identical between
  the two failure cases is the concrete test for the information-leak
  requirement, not just a manual check.
- Refresh: valid refresh rotates successfully; expired session
  (`expiresAt` in the past, `Session` document still physically present
  — i.e. before TTL sweep) is rejected as `REFRESH_FAILED` even though
  the document still exists in the test DB — this is the direct test of
  L13's independent-check requirement (expressed via the corrected
  `findOneAndDelete` filter condition, Phase C), not something a TTL
  index could ever be relied on to produce deterministically in a fast
  test run.
- Logout: deletes the `Session`; is idempotent (calling logout twice, or
  on a nonexistent `sid`, does not throw).
- `auth.service.js` operations: register, login, refresh, logout — no
  `resolveActor` service test, since that logic now lives exclusively
  in the middleware (Phase E) and is covered by the middleware tests
  below, not duplicated here.

### Middleware tests
- Valid access token → `actorContext` populated correctly.
- Expired token → `actorContext = null` (not a hard throw at the
  middleware layer, per Phase E's design).
- Malformed/tampered token (bad signature) → same.
- Missing cookie entirely → same, and a subsequent anonymous-permitted
  route still works (Invariant 5 regression check).
- User deleted after token issuance → `actorContext = null` (L11's
  concrete regression test).
- **Changed role reflected freshly**: issue a token, then change the
  user's `role` directly in the DB (simulating an admin action outside
  this request), then verify the *next* request using the same,
  still-valid access token reflects the *new* role — this is the direct
  test proving role is never trusted from the token itself.

### Session/refresh-specific tests
- `tokenHash` stored is genuinely a hash, never the raw token
  (assert the stored value doesn't equal, and isn't trivially derivable
  from, the raw token string).
- Expired-but-undeleted session (pre-TTL-sweep) is rejected by the
  service check, not relying on MongoDB to have removed it.
- Logout removes refresh capability (a subsequent refresh attempt with
  the now-deleted session's token fails) while a *separately issued,
  still-valid* access token from before logout continues to work until
  its own natural expiry (the direct test of L17 — this is arguably the
  single most important test in the whole suite, since it's the one
  most likely to be "fixed" as a false bug by a future contributor who
  hasn't read L17).
- **Concurrency test — the one explicitly required to be strict**: two
  simultaneous `refresh()` calls using the identical refresh token/`sid`
  (mirroring `issue.service.test.js`'s existing `Promise.allSettled`
  concurrency-test pattern for `resolved → verified`). Assert exactly
  one call succeeds and exactly one fails with `REFRESH_FAILED`
  — **a plan or implementation where both could succeed, or where the
  test only checks "at least one succeeded" without checking the other
  explicitly failed, does not satisfy this requirement** and should be
  rejected in review before being accepted as done.

---

## File-by-file impact table

| File | Create / Modify | Purpose | Why necessary |
|---|---|---|---|
| `server/src/config/env.js` | Create | Single, intentional dotenv-loading + validated config entry point (correction — see Phase A) | Removes the hidden `db.js`-import-as-config-loader coupling flagged in review |
| `server/src/models/Session.js` | Create | Persist refresh-token/session state (L8/L9) | New collection, locked by architecture |
| `server/src/services/auth.service.js` | Create | register/login/refresh/logout | Core of the milestone (actor resolution excluded — owned by middleware, see Phase E correction) |
| `server/src/services/auth-tokens.js` | Create | Password hashing, JWT sign/verify, refresh-token hashing | Isolates crypto/token mechanics from business logic, mirroring Phase D's separation of concerns |
| `server/src/services/errors.js` | Modify | Add a minimal auth-specific error set (final set per corrected Phase I — see below) | Extends the existing, deliberately flat error contract — no new class hierarchy |
| `server/src/middleware/auth.js` | Create | Produces `actorContext` from a request; sole owner of request-actor resolution (correction — see Phase E) | The boundary Phase D was built to eventually receive from |
| `server/src/routes/auth.routes.js` | Create | The five auth endpoints | L4's locked minimal API surface |
| `server/src/validation/auth.validation.js` | Create | `registerSchema`, `loginSchema` | Matches existing per-entity validation file convention |
| `server/src/app.js` | Modify | Mount `cookie-parser`, `cors` (configured per Phase H/A), and the new auth router | Required wiring; `cors` specifically required for L1 to function at all |
| `server/src/config/db.js` | **Modify (small, corrected from "untouched")** | Import `env.js` instead of calling `dotenv/config` directly | Collapses env loading to one real entry point (correction — see Phase A); `connectDB()`'s own logic and `{ envVar }` parameter are unchanged |
| `server/package.json` | Modify | Add `jsonwebtoken`, `cookie-parser`, `cors`, and (pending Phase A confirmation) `express-rate-limit` | Dependency additions per Phase A — **not applied until Phase A's open items are confirmed** |
| `server/README.md` | Modify | Document `Session` collection, new env vars (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` if that split is confirmed; `COOKIE_SAME_SITE`, `COOKIE_DOMAIN` per Phase H), auth routes, and the new `env.js` entry point | Keeps the existing "what arrives at each milestone" section accurate, following the project's own documentation discipline |
| `server/scripts/verify-models.js` | Modify | Add `Session` model checks | Mechanical extension of existing offline verification tooling |
| `docs/architecture/decision-register.md` | Modify (later, not part of this plan) | Add any newly-confirmed implementation-level choices worth recording | Only after Phase A/G/I's flagged open items are actually resolved — not part of this planning document's own changes |
| `server/tests/auth.service.test.js` | Create | Service-level test coverage | Phase J |
| `server/tests/auth.routes.test.js` | Create | Route/cookie-level test coverage | Phase J — cookie issuance can't be exercised by a pure service-unit test |

### Explicitly untouched files

- `server/src/models/User.js` — no changes; confirmed against L8
  (session state does not live here)
- `server/src/models/Issue.js`, `Knowledge.js`, `Comment.js`,
  `Project.js` — no changes
- `server/src/services/issue.service.js`,
  `knowledge.service.js`, `comment.service.js`, `project.service.js` —
  no changes, including **no changes to `authorizeTransition()` or the
  `AUTHORIZATION_POLICY_UNRESOLVED` throw for `acknowledged →
  in_progress` / `in_progress → resolved`** — D-3a stays exactly as
  Phase D left it
- `server/src/validation/issue.validation.js`,
  `knowledge.validation.js`, `comment.validation.js`,
  `project.validation.js` — no changes
- `server/src/server.js` — no changes expected (startup/shutdown
  lifecycle is unaffected by adding a new model/router)
- Every domain lifecycle rule (Issue's `LEGAL_TRANSITIONS`, Knowledge's
  review lifecycle, Comment's one-level-nesting rule, Project's
  origin-issue-immutability rule) — untouched

---

## Implementation order

Sequenced to minimize partially-integrated states — each step should
leave the repository in a state where existing tests still pass, even
if the new feature isn't complete yet.

| Step | Files | Depends on | Verification | Expected result |
|---|---|---|---|---|
| 1 | Phase A dependencies confirmed and added to `package.json` | Review sign-off on Phase A's open items (hashing library, secret-splitting, rate-limiting) | `npm install` | Clean install, no version conflicts |
| 2 | `server/src/config/env.js` (new), `server/src/config/db.js` (small modify — import `env.js` instead of `dotenv/config` directly) | Step 1 | `npm run verify:models`, `npm run verify:validation`, and `npm test` all still pass unchanged | Env loading still works identically through the new single entry point; zero regressions in the 38/44/61 existing checks — this step is a pure refactor, not a behavior change, and should be verifiable as such |
| 3 | `server/src/models/Session.js` | Step 2 | Extend + run `npm run verify:models` | New `Session` checks pass alongside the existing 38 |
| 4 | `server/src/services/errors.js` extended | None (pure addition) | `node --check` | New codes available for step 5 to use |
| 5 | `server/src/services/auth-tokens.js` | Steps 1–2 (`jsonwebtoken`, `env.js`), Phase A's hashing decision | Small standalone script or a first test file exercising sign/verify/hash round-trips | Round-trip sign→verify succeeds; tampered/expired tokens correctly rejected |
| 6 | `server/src/validation/auth.validation.js` | None | Extend + run `npm run verify:validation` | New schema checks pass alongside the existing 44 |
| 7 | `server/src/services/auth.service.js` | Steps 3–6 | `server/tests/auth.service.test.js` (Phase J) | All service-level tests pass against real `TEST_MONGO_URI`, including the concurrency test |
| 8 | `server/src/middleware/auth.js` | Step 7 | Dedicated middleware tests (Phase J) | `actorContext` correctly populated/nulled across all cases in Phase J's middleware test list; `/me` reads `req.actorContext` with no parallel resolution path |
| 9 | `server/src/routes/auth.routes.js` + `app.js` wiring (`cookie-parser`, `cors`, router mount) | Steps 7–8 | `server/tests/auth.routes.test.js` (Phase J), plus a manual/curl check of `Set-Cookie` headers | Cookies set/cleared correctly; end-to-end register→login→refresh→logout flow works over HTTP |
| 10 | `server/scripts/verify-models.js` extended (if not already done at step 3), `server/README.md` updated | Steps 1–9 stable | Manual read-through | Documentation matches what was actually built, not what was originally planned if anything changed during implementation |
| 11 | `docs/architecture/decision-register.md` updated with any newly-confirmed implementation-level choices from Phase A/G/I | Steps 1–10 complete and reviewed | Manual read-through | Register reflects final, actually-built state — not promoted speculatively before implementation confirms the open items |

Each step should be its own reviewable unit — consistent with this
project's existing discipline of not writing large, uninterrupted
passes of code.

---

## Risks and open implementation items

### Locked architecture — do not reopen

Everything in `decision-register.md`'s "🔒 Locked — Authentication"
section: L1 (topology), L2/L2a (cookie transport/attributes split), L3
(security posture), L4/L5 (scope + boundary test), L6 (`actorContext`
unchanged), L7 (D-3a unresolved), L8/L9 (`Session` collection, named
`Session`), L10/L16 (JWT payload split), L11 (fresh role resolution),
L12 (hashed credential storage), L13 (TTL ≠ enforcement), L14/L14a
(rotation strategy + single-use guarantee), L15 (`sid`-based lookup),
L17 (logout/access-token-expiry semantics).

### Implementation-level choices — genuinely open, listed with resolution timing

| Item | Resolve... | Why |
|---|---|---|
| Password-hashing mechanism (`node:crypto` scrypt vs. `bcrypt`/`bcryptjs`) | **Before implementation** | Affects Phase A's dependency list and Phase D's utility function signatures; changing it later means rewriting stored hashes for any already-registered user, which is exactly the kind of migration cost worth avoiding by deciding first |
| Single shared `JWT_SECRET` vs. split `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` | **Before implementation** | Affects env var names referenced throughout Phase D/Phase A; a later rename is cheap in code but costly in already-configured deployment environments |
| `express-rate-limit` inclusion | **Before implementation**, but low-cost to defer | Affects Phase A's dependency list and `app.js`/`auth.routes.js` wiring; if deferred, the reserved `AUTH_RATE_LIMIT_*` env vars simply stay unused for now, which is a safe, non-breaking deferral |
| Raw refresh-token JWT hashed-as-is vs. a separate opaque secret alongside a lighter-weight JWT | **Before implementation** | Determines whether `generateRefreshTokenSecretMaterial()` exists at all (Phase D); recommended default (hash the JWT itself) needs explicit confirmation, not silent adoption |
| `EMAIL_ALREADY_REGISTERED` as its own error code vs. reusing `VALIDATION_FAILED` | **During implementation, low stakes** | Purely a code-naming granularity choice with no architectural weight; easy to change later without data migration concerns |
| Exact minimum password length/complexity | **Resolved in this correction pass** — 8-character minimum, reasonable max, no composition rules (see Phase G). `registerSchema` may be implemented directly against this. | N/A |
| `SameSite`/`Domain` cookie values | **After the first implementation slice — specifically, when real hosting targets are chosen** | Genuinely cannot be answered from architecture alone; the implementation should read these from env vars specifically so this doesn't block writing the code itself, only the final production configuration |
| `SESSION_EXPIRED`/`SESSION_REUSE_DETECTED` split vs. single `REFRESH_FAILED` code | **Resolved in this correction pass** — collapse to one generic `REFRESH_FAILED`-style code (see Phase C's corrected mechanism and updated Phase I below); the atomic `findOneAndDelete` consume can no longer distinguish these cases without a non-atomic follow-up read, which isn't worth the complexity | N/A |
| Session-file naming (`Session.js`, confirmed) vs. `RefreshToken.js` | **Resolved already** — L9 locked `Session` as the collection/concept name in the decision register; no further action needed | N/A |

**Explicit statement per the instructions**: none of the items above
have been silently converted into architectural decisions by this
document. Each is presented with its options intact and a recommended
default where one exists, but none are treated as locked — they remain
"implementation-level, pending confirmation" exactly as the decision
report's §2 already categorized their predecessors.

### Additional risks surfaced during this planning pass

- **Duplicate-email race window**: the service-level `findOne` check
  and the schema-level unique index are two different mechanisms with a
  gap between them under true concurrency (two simultaneous
  registrations with the same email). This is handled correctly in the
  plan (the DB-level unique-index error is the actual backstop, not the
  `findOne` check), but it's worth flagging that this is structurally
  different from the refresh-rotation race (Phase C) — that one uses an
  explicit conditional delete for atomicity; this one relies on a
  unique index's built-in atomicity instead. Both are valid, but they
  are different mechanisms and shouldn't be conflated during review.
- **`cors` misconfiguration risk**: setting `Access-Control-Allow-Origin: *`
  (the easy, wrong default) is incompatible with
  `Access-Control-Allow-Credentials: true`, which cookies require for
  cross-origin requests. The `cors` package must be configured with an
  explicit origin (or origin-checking function reading
  `ALLOWED_ORIGINS`) and `credentials: true` — a generic "just enable
  CORS" pass would silently break cookie-based auth under Topology B
  rather than merely being insecure. Flagging this as a concrete
  implementation trap, not just a checkbox.
- **Test-environment TTL reliance**: Phase J's expired-session test
  must construct an already-expired `Session` directly (setting
  `expiresAt` in the past at creation), not wait for a real TTL sweep —
  MongoDB's TTL monitor's ~60-second periodic interval makes it
  unsuitable for fast, deterministic test timing. This is a test-design
  detail worth stating explicitly so it isn't discovered awkwardly
  during Phase J.

---

## Final deliverable summary

- **Implementation plan**: Phases A–J above.
- **Proposed phase sequence**: the 10-step ordered table in
  "Implementation order."
- **Complete file-impact matrix**: the table above, with an explicit
  "explicitly untouched" list.
- **Test strategy**: Phase J, including the mandatory strict
  concurrency test for the single-use refresh guarantee.
- **Remaining decisions**: the implementation-level items table above,
  each tagged with when it must be resolved.

No code, models, services, routes, middleware, validation schemas,
dependencies, or environment files have been created or modified as
part of producing this plan.
