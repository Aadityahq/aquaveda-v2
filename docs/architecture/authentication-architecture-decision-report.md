# Authentication milestone — consolidated architecture decision report (Step 4)

**Status: decision report only. No code. Nothing here is yet written
into `docs/architecture/decision-register.md`** — that promotion is the
next action after this report is accepted, not part of this document.

Consolidates: the original 8-question review
(`authentication-milestone-review-draft.md`), the scope-boundary
analysis (`authentication-scope-boundary-analysis.md`), and the session-
storage design (`authentication-session-storage-design.md`), as
corrected by review.

---

## 1. Decisions now locked

| # | Decision | Summary |
|---|---|---|
| L1 | Deployment topology | Topology B — frontend and backend deploy independently; browser talks to the API over HTTPS as a separate deployment unit. Cookie attributes and CORS must be configured for genuine cross-origin operation, not tuned loosely for local convenience. |
| L2 | Browser token transport | HttpOnly cookies only, for both access and refresh tokens. No `localStorage`, no `sessionStorage`, no frontend-managed bearer headers. |
| L2a | Cookie attribute split | **Locked now**: `Secure: true` in production, unconditionally (HttpOnly is already established by L2 and not restated here). **Deployment-dependent, not locked**: `SameSite`, `Domain`, `Path` — depend on actual hosting targets not yet chosen (see R1). |
| L3 | Security posture | Proportionate to a low-friction community platform: correctness, reasonable security, maintainability, low friction, operational simplicity — in that order. Not banking-grade ceremony. |
| L4 | Milestone scope | Authentication infrastructure **and** the five-endpoint minimal auth API (`register`, `login`, `logout`, `me`, `refresh`). General domain routes (Issue/Knowledge/Comment/Project) are excluded. |
| L5 | Scope boundary test | An endpoint belongs to this milestone iff its responsibility is establishing, resolving, or terminating an authenticated session/identity — not iff it happens to be implemented by calling a particular file. Concretely today that means it never invokes a pre-existing domain service (`issue.service.js`, `knowledge.service.js`, `comment.service.js`, `project.service.js`); the file-level fact is a *consequence* of the responsibility boundary, not the boundary's definition — so the test still applies correctly even if `auth.service.js` is later split into multiple files. |
| L6 | `actorContext` contract | Unchanged: `{ id, role }`, opaque input to every domain service. Authentication middleware is the sole producer; no service signature changes. |
| L7 | D-3a | Remains fully unresolved. `AUTHORIZATION_POLICY_UNRESOLVED` stays exactly as Phase D implemented it for `acknowledged → in_progress` and `in_progress → resolved`. Authentication establishes identity/role; it does not and must not determine remediation authority. |
| L8 | Refresh-token/session storage | Dedicated collection, not a `User`-embedded field. Governing rationale: identity and session have different responsibilities, lifecycles, retention rules, and invalidation semantics — independent of rotation strategy/write frequency. |
| L9 | Collection name | `Session` (not `RefreshToken`) — represents a session lifecycle, which may eventually carry more than a token hash (revocation metadata, last-used timestamps, device metadata if ever justified), not merely one credential. |
| L10 | JWT payload — identity only, no role | Both access and refresh JWTs carry identity (`sub`) and never a `role` claim — role is never trusted from a token, always resolved fresh from the DB (L11). The exact payload composition differs between access and refresh tokens; see L16 for the confirmed split and its justification. |
| L11 | Role resolution | Authentication middleware resolves the user's *current* role from the database on every request that needs `actorContext`, correcting V1's specific defect (trusting a decoded JWT payload's role without a DB lookup). |
| L12 | Credential storage | Refresh tokens are stored server-side only as hashes (`Session.tokenHash`), never as raw tokens. Consistent with `User.passwordHash`'s existing pattern. |
| L13 | Session expiry enforcement | A MongoDB TTL index on `Session.expiresAt` handles eventual physical cleanup, but is **not** the expiry check itself. The service layer must independently verify `expiresAt > now` before treating any session as valid — the TTL monitor's periodic sweep is a cleanup mechanism, not a real-time invalidation guarantee. |
| L14 | Refresh strategy | Simple refresh-token rotation: each successful refresh invalidates the prior `Session` document and issues a new one. No reuse-detection system, no device fingerprinting. |
| L14a | Single-use refresh guarantee | **Locked as an architectural requirement, not an implementation detail**: once a refresh token has been successfully used to rotate, that exact token must never succeed again — a second attempt with the same (now-superseded) token must fail, unconditionally, regardless of timing. This is a correctness property of the rotation design itself, not merely a nice-to-have optimization deferred to implementation. Only the *mechanism* by which this is enforced under concurrent requests is left open (see R3) — the guarantee itself is not. |
| L15 | Session lookup mechanism | The refresh JWT carries a session identifier (`sid`, the `Session` document's own `_id`) alongside `sub`. Refresh resolves the exact `Session` by `sid`, then verifies it belongs to `sub` and has not expired, rather than resolving by `userId` alone — the latter breaks as soon as multiple concurrent sessions exist, which the `Session`-collection design deliberately doesn't preclude. |
| L16 | Access vs. refresh JWT payload split | **Access token: `{ sub }` only. Refresh token: `{ sub, sid }`.** See justification below — this is not a default carried over unexamined, it's confirmed against a concrete test. |
| L17 | Logout vs. access-token expiry | **Locked as an explicit, intended behavior, not a gap to close**: logout deletes the current `Session` document, which immediately invalidates the refresh token — but does **not** and cannot invalidate an already-issued, unexpired access token, since access tokens are stateless JWTs verified without any DB/session lookup (that statelessness is the point of L11's design — role is re-checked per request, but token *validity* itself isn't). A logged-out user's short-lived access token therefore continues to authenticate requests until its own natural expiry, at most a few minutes (exact lifetime set via `JWT_ACCESS_EXPIRES`, already in `server/README.md`'s env block). This is the accepted proportionate trade-off under L3 for a low-friction community platform, not a bug to be fixed by adding a per-request session-validity check to the access-token path — doing so would reintroduce the per-request `Session` lookup L16 explicitly decided against. |

### L16 justification — why `sid` belongs only on the refresh token

The question actually asked: is there a concrete current requirement for
session identity on *every access-token request*, not just at refresh
time? Walking through what each token is actually used for:

- **Access token's job**: on every request, prove `sub` (identity),
  which the middleware uses to look up the user's *current* role from
  the DB (L11) and construct `actorContext = { id, role }`. Nothing in
  that flow reads or needs a `Session` document — role resolution is a
  `User` lookup by `sub`, not a `Session` lookup. Adding `sid` to the
  access token gives the access-token verification path a field it has
  no code path that consumes.
- **Refresh token's job**: identify *which* `Session` document a refresh
  request is rotating (L15). This genuinely requires `sid` — without it,
  refresh would have to resolve by `userId` alone, which is exactly the
  design flaw L15 already rejects once multiple concurrent sessions
  exist.
- **The one plausible counter-argument** — using `sid` on the access
  token to support immediate session-revocation propagation (e.g. "admin
  force-logs-out a user, and their still-valid short-lived access token
  should stop working immediately rather than waiting out its natural
  expiry") — is **not a current requirement**. No product surface,
  invariant, or prior document in this milestone's review calls for
  instant access-token revocation. L3's proportionate-security posture
  argues the opposite: a short access-token lifetime (already the
  design, per the original review's §7) is the accepted proportionate
  mechanism for bounding exposure after logout/revocation, not
  per-request session-table lookups on the hot path of every
  authenticated request. Adding `sid` to the access token without this
  requirement would only invite exactly that unrequested check to be
  built later "since the field's already there."

Conclusion: no concrete current requirement demonstrates a need for
`sid` on the access token. **Access: `{ sub }`. Refresh: `{ sub, sid }`**,
as recommended, is confirmed rather than assumed.

---

## 2. Remaining unresolved decisions (implementation-level, not architectural)

These are appropriately left to implementation planning — none of them
carry the weight of L1–L17 above, and none of them block promoting
L1–L17 into `decision-register.md`.

### R1. Deployment-dependent cookie attributes

**Locked as part of this report** (not deferred): every auth cookie is
`HttpOnly: true` (per L2) and `Secure: true` in production — these are
non-negotiable regardless of deployment target and require no further
information to decide.

**Still deployment-dependent, genuinely unresolved:**
- `SameSite` — this does **not** default to "cross-site" merely because
  frontend and backend are separate deployments (L1). The relevant
  distinction is *registrable domain*, not deployment independence:
  sibling subdomains under one parent domain (e.g. `app.aquaveda.com`
  and `api.aquaveda.com`) are same-site for cookie purposes even though
  they're separately deployed, and `SameSite=Lax` works correctly for
  that case, including ordinary fetch/XHR requests from the frontend.
  `SameSite=None` (plus mandatory `Secure`) is only required if the
  frontend and backend end up on genuinely different registrable
  domains (e.g. `aquaveda.vercel.app` and a different provider's
  domain for the API). Which of these applies is a fact about the
  chosen hosting targets, not a property of Topology B itself — Topology
  B says "separately deployed," it does not say "cross-site."
- `Domain` — depends on the actual hosting targets chosen at deployment
  time; not decidable from architecture alone.
- `Path` — likely `/auth` or `/` depending on whether the refresh cookie
  should be scoped narrowly to the refresh endpoint or sent on every
  request; a real but small implementation choice.

**Recommendation for the deployment-dependent items**: decide once
actual hosting targets are chosen — confirm whether frontend and backend
will share a registrable domain (favoring `SameSite=Lax`, simpler and
more restrictive by default) before assuming the `SameSite=None` path is
required. No default is assumed here, since assuming the wrong one in
either direction is a real category of bug, not just a suboptimal
default.
**Affects**: cookie-setting logic in `auth.service.js` / middleware,
CORS config in `app.js`.

### R2. Exact `DomainErrorCode` naming for auth-specific failures

**Decision needed**: names such as `INVALID_CREDENTIALS`,
`EMAIL_ALREADY_REGISTERED`, `SESSION_EXPIRED`, `SESSION_NOT_FOUND` —
exact enum values and whether any existing codes (`UNAUTHORIZED`,
`VALIDATION_FAILED`) are reused vs. new ones added.
**Recommendation**: new, auth-specific codes, following Phase D's
existing pattern of "one error class, one `code` field, no class
hierarchy" — reuse `errors.js`'s existing shape, extend the enum.
**Affects**: `server/src/services/errors.js`.

### R3. Mechanism enforcing the single-use refresh guarantee (L14a)

**Decision needed**: the single-use guarantee itself is locked (L14a) —
what remains open is purely the technical mechanism that enforces it
under concurrent requests (e.g. two near-simultaneous refresh calls
racing on the same now-superseded token).
**Recommendation**: apply the same conditional-atomic-update discipline
already locked for Issue/Knowledge lifecycle transitions (ADR-0006) —
delete-and-recreate or a single atomic find-and-replace keyed on the old
session's `_id`, with the same "zero-match distinguishes race from
already-gone" discipline already proven in Phase D. This is a direct
reuse of an existing pattern, not a new one to invent.
**Affects**: `auth.service.js`'s refresh implementation, and possibly a
new `STATE_RACE`-equivalent handling path (or literal reuse of the
existing `STATE_RACE` code, to be decided under R2).

### R4. Exact Zod schemas and route request/response shapes

**Decision needed**: field names, validation rules for
register/login payloads, response envelope shape.
**Recommendation**: follow the existing `validation/*.validation.js`
convention exactly (per-entity file, Zod schemas exported, structural
concerns only — range/business validation stays out of Mongoose per the
GeoJSON precedent already in the register).
**Affects**: new `server/src/validation/auth.validation.js`.

---

## 3. Authentication milestone scope recommendation (restated)

**In scope:**
- `auth.service.js` — register, login, logout, refresh, me-resolution
  logic
- `Session` model
- Auth middleware — cookie extraction, JWT verification, `Session`
  lookup by `sid`, DB role resolution, `actorContext` attachment
- Five routes: `POST /auth/register`, `POST /auth/login`,
  `POST /auth/logout`, `GET /auth/me`, `POST /auth/refresh`
- Auth-specific Zod validation schemas
- Auth-specific `DomainErrorCode` extensions

**Out of scope (deferred to a future Routes milestone):**
- Issue/Knowledge/Comment/Project routes and controllers
- Any general-purpose request validation/pagination/filtering middleware
  intended for reuse across domain routes
- API versioning scheme for the general API surface

---

## 4. Exact files likely to be created or modified (implementation planning reference only)

**New:**
- `server/src/models/Session.js`
- `server/src/services/auth.service.js`
- `server/src/middleware/auth.js`
- `server/src/routes/auth.routes.js`
- `server/src/validation/auth.validation.js`
- `server/tests/auth.service.test.js`
- `server/tests/auth.routes.test.js` (or equivalent route-level test —
  cookie issuance/reading needs exercising beyond a pure service-unit
  test)

**Modified:**
- `server/src/services/errors.js` — extended `DomainErrorCode` enum
  (R2)
- `server/src/app.js` — mount auth router, add cookie-parsing middleware
  (e.g. `cookie-parser`), confirm CORS config matches Topology B (L1)
- `server/README.md` — document new env vars (JWT secret(s), token
  lifetimes — exact names to be decided at implementation time, likely
  extending the existing `JWT_SECRET`/`JWT_ACCESS_EXPIRES`/
  `JWT_REFRESH_EXPIRES` entries already present in the env block)

**Explicitly not modified:**
- `server/src/models/User.js`
- `server/src/services/issue.service.js`,
  `knowledge.service.js`, `comment.service.js`, `project.service.js`
- Any file under `server/src/validation/` other than the new
  `auth.validation.js`

---

## 5. Explicit anti-goals

Restated in one place, consolidating everything flagged across all
three prior documents:

- Do not resolve D-3a. Do not replace `AUTHORIZATION_POLICY_UNRESOLVED`
  with any role check, Project-membership check, or other mechanism, in
  `changeStatus()` or anywhere else, for any reason, as part of this
  milestone.
- Do not change `actorContext`'s shape or any domain service's
  signature.
- Do not build password reset/forgot-password.
- Do not build full multi-device session management, device
  fingerprinting, or reuse-detection beyond simple rotation.
- Do not build an Expert-role acquisition mechanism.
- Do not add a `status`/`isActive` field to `User`.
- Do not build OAuth/social login, MFA, or magic links.
- Do not build Issue/Knowledge/Comment/Project routes or controllers.
- Do not build generic reusable routing/validation/error-handling
  infrastructure "while we're setting up routing anyway" — that belongs
  to a future Routes milestone's own review.
- Do not add role-based route guards in middleware — all domain
  authorization stays in the service layer, exactly as today.
- Do not treat TTL-index presence as sufficient expiry enforcement
  (L13) — the explicit `expiresAt > now` check is required regardless.
- Do not embed session/refresh-token state on `User` (L8).
- Do not add a per-request `Session`/DB lookup to access-token
  verification to make logout "instant" (L17) — the access token's
  statelessness and short lifetime is the accepted mechanism for
  bounding post-logout exposure, not a gap to patch.

---

## 6. Risks / architectural traps discovered across this review

- **D-3a temptation.** The single sharpest risk in the whole milestone,
  flagged in every prior document and restated here because it's worth
  the repetition: real roles becoming available for the first time will
  make `acknowledged → in_progress` / `in_progress → resolved` look
  "obviously" fixable by a role check. It is not fixed by this
  milestone. Any resolution requires a dedicated Project/Act
  authorization design session.
- **Scope bleed from auth routing into general routing.** Building the
  five auth endpoints creates a natural moment to also stand up generic
  Express infrastructure (shared error middleware, generic validation
  wrappers) intended for future domain routes. That's the actual Routes
  milestone's decision to make, not a side effect of this one.
  
- **Duplicating domain authorization in middleware.** Auth middleware's
  job stops at producing `actorContext`. EXPERT-only checks,
  `resolverId !== verifierId`, and all other domain authorization stay
  exactly where Phase D put them.
- **TTL-as-enforcement conflation.** Treating the MongoDB TTL index as
  sufficient session-expiry enforcement (rather than a cleanup
  mechanism) would create a real window where an expired-but-not-yet-
  swept session document is still treated as valid. L13 exists
  specifically to prevent this.
- **JWT payload creep.** Once a session identifier (`sid`) is added to
  the refresh payload for lookup purposes (L15/L16), there's a natural
  next temptation to also add role, permissions, or `sid` itself to the
  *access* token "for consistency" or "in case it's useful later." L16
  keeps the access token at `{ sub }` only, confirmed against a concrete
  requirement check, not assumed — anything else needing to be "known"
  about the request comes from a DB read, not the token.
- **Rotation-mechanism underspecification.** The single-use guarantee
  itself is locked (L14a) — the risk is only in *how* it gets enforced.
  A naive implementation (read old session, then delete, then create
  new, as three separate steps) reintroduces exactly the race-condition
  class Phase D's conditional-atomic-update work already solved once for
  Issue/Knowledge lifecycle transitions. R3 flags this explicitly so the
  mechanism isn't reinvented poorly during implementation.
- **Logout-vs-access-token-expiry confusion during implementation.**
  Without L17 stated explicitly, a future implementer (or reviewer)
  testing "does logout actually work" by immediately retrying a request
  with the old access token may observe it still succeeding and treat
  that as a bug. It is the intended, locked behavior — the test that
  actually matters is that the *refresh* token stops working after
  logout, not that the access token dies instantly.

---

## 7. What happens next

This report, once accepted, is the trigger for:

1. Promoting L1–L17 into `docs/architecture/decision-register.md` as a
   new `🔒 Locked — Authentication` section, in the same style as the
   existing Domain Model / Persistence Design / Phase D sections.
2. Only then beginning actual implementation planning (file-by-file, in
   the order: `Session` model → `errors.js` extension →
   `auth.validation.js` → `auth.service.js` → `auth.js` middleware →
   `auth.routes.js` → `app.js` wiring → tests), each following the
   project's existing propose → review → correct → lock discipline
   rather than being written in one uninterrupted pass.

No code has been written as part of this report. No file listed in §4
has been created or modified.
