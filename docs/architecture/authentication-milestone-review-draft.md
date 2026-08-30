# Authentication milestone — architecture review

**Status: PARTIALLY LOCKED.** Deployment topology, browser token
transport, and security posture (below) were reviewed and locked by the
Principal Architect. Everything else in this document remains DRAFT —
not an ADR, not yet promoted to `decision-register.md`. No code changes
accompany this document.

Answers the 8 original questions, in order, now updated to reflect the
three locked decisions.

---

## 🔒 Locked by this review

### L1. Deployment topology — Topology B (separated frontend/backend)

Frontend and backend deploy independently; the browser talks to the
backend API over HTTPS as a separate origin (or at least a separate
deployment unit — see cookie-attribute note below). Authentication must
work correctly under this split, not under an assumed same-origin
monolith. This does not reopen ADR-0002 (Express as a sibling service)
— it's a deployment-topology confirmation that constrains *how*
cookies/CORS must be configured, not a re-litigation of the
Next.js/Express split itself.

Consequence: cookie `SameSite`/`Secure`/domain attributes and CORS
configuration (`ALLOWED_ORIGINS`, already present in `server/README.md`'s
env block) must be set up for a genuine cross-origin browser↔API
relationship, not tuned loosely for local same-origin convenience and
left unverified for production.

### L2. Browser authentication model — HttpOnly cookies only

- Access token: `HttpOnly` cookie.
- Refresh token: `HttpOnly` cookie.
- The browser/frontend never reads, stores, or attaches these tokens
  itself — no `localStorage`, no `sessionStorage`, no manual
  `Authorization: Bearer` header assembly in frontend code.
- This **replaces** §7's earlier "recommendation" framing for the
  access-token transport with a locked decision. It does not yet resolve
  where refresh-token *state* is persisted server-side (User field vs.
  new collection) — that remains open, see §Remaining Unresolved
  Decisions below. It only locks that the refresh token *itself*, in
  the browser, is an HttpOnly cookie, same as the access token.

### L3. Security posture — proportionate, not maximal

AquaVeda is a low-friction community platform, not a banking-grade or
high-security enterprise system. Design priorities, in order: correctness,
reasonable security, maintainability, low user friction, operational
simplicity. This locks the *posture*, which directly informs (without yet
finally deciding) several of the open items below — e.g., it argues
against building a full revocation-list/device-management system, and
against requiring anything beyond standard password hashing + HttpOnly
cookies + CSRF-appropriate defaults. It does not by itself pick a specific
mechanism for any remaining open item; it's the lens those decisions get
made through.

---

## 1. Is Authentication actually the correct next milestone?

**Yes, on the existing plan — this isn't a new proposal, it's confirming
an old one still holds.** The original milestone order
(`Foundation → Domain Model → Authentication → Explore → Learn → Act →
Community → Dashboard → AI`) already placed Authentication immediately
after domain/persistence work, before any feature surface. Nothing
discovered during Persistence Design or Phase D contradicts that
ordering — if anything, Phase D reinforces it:

- Every service function currently takes a **hand-constructed**
  `actorContext = { id, role }` in tests (`fakeActor()` helpers). That's
  correct for unit-testing services in isolation, but it means **nothing
  in this codebase can currently authenticate a real user** — there is
  no path from an HTTP request to an `actorContext` at all.
- Product Invariant 6 ("Contributing requires an account... no anonymous
  writes, anywhere") is currently unenforceable outside of tests, because
  there's no identity layer to enforce it against.
- Routes/controllers are the only other unblocked milestone, and wiring
  routes before identity exists means either (a) routes ship with no
  real auth and get retrofitted later, or (b) someone stubs identity
  inline per-controller "temporarily" — exactly the shortcut this
  project has been structurally avoiding (see CLAUDE.md Next Milestone
  reasoning from the last update).

**Caveat worth stating plainly:** this milestone is *identity and
session*, not authorization policy in general. It answers "who is
making this request," not "what may every role do." The latter is
already substantially answered by the service layer's existing
authorization checks (EXPERT-only review/verification,
`resolverId !== verifierId`, etc.) and by D-3a's deliberate non-answer.
Authentication's job is to feed `actorContext` into a system that
already knows what to do with it — not to redesign that system.

---

## 2. What does AquaVeda currently need from Authentication vs. what
   should remain deferred?

### Needed now (blocks everything downstream)

- Registration (email + password → `User` document)
- Login (credential verification → session/token issuance)
- A way for an authenticated request to arrive at a route/controller
  with a resolved `{ id, role }` — i.e., **production `actorContext`
  construction**
- Logout (session/token invalidation)
- Password hashing at rest (`passwordHash` field already exists on
  `User`, unused so far — Phase D never touched it)
- "Who am I" (`/me`-equivalent) for the frontend to know the current
  session's identity/role, since Product Invariant 5 requires anonymous
  browsing to keep working — the frontend needs to distinguish
  "anonymous" from "authenticated" cleanly, not assume auth always
  succeeded

### Explicitly deferred (do not build now)

- **Password reset / forgot-password flow.** V1 never actually built
  this despite README claims to the contrary (per the original context
  transfer's V1 findings — stale README references to OTP/SMTP/Resend
  that were never real). No current product requirement forces this
  into V1's first release; email delivery infrastructure is a real cost
  to take on and nothing depends on it yet.
- **Refresh-token rotation as a hardened, multi-device system.** V1 had
  no refresh flow at all. V2 needs *something* better than V1's "trust
  the decoded JWT payload, no DB lookup" pattern (a real security gap,
  not just a style complaint), but a full rotating-refresh-token system
  with device tracking and revocation lists is more than the current
  product needs. See §7 for the minimum viable version.
- **Expert role acquisition mechanism.** Already an explicitly deferred
  item in `decision-register.md`: `role: EXPERT` as a fact is
  established (the enum exists on `User`), but *how* a user becomes an
  EXPERT is not this milestone's problem. Authentication produces
  `actorContext` from whatever role is already stored on the `User`
  document; it does not decide how that role got there. Likely an
  ADMIN-driven action later, but that's a future decision, not this
  one.
- **Account suspension/deactivation.** Already deferred in
  `decision-register.md` (D: "User suspension/deactivation... adding a
  status field now would be speculative"). Authentication should not
  reopen this by adding a `status`/`isActive` field as a side effect of
  building login.
- **OAuth/social login, MFA, magic links.** No product requirement, no
  precedent, not worth the surface area yet.
- **Any resolution of D-3a.** Authentication produces identity; D-3a is
  about a specific *authorization* question (who may assert Issue
  remediation progress) that Authentication must not be tempted to
  answer as a side effect of "since we're doing auth anyway." See §6.

---

## 3. What identity model should exist?

Minimal and consistent with what's already built:

- **One `User` collection, already correct as-is.** `role` enum
  (`USER | EXPERT | ADMIN`), `passwordHash` with `select: false` and
  `toJSON` stripping — all already present and already reviewed. This
  milestone should not need schema changes to `User` beyond possibly
  adding fields required for session/token bookkeeping (see §7 on
  whether that's even necessary).
- **Role continues to live as a flat field on `User`,** not a separate
  roles/permissions collection. Nothing about Authentication's needs
  argues for a more complex model — over-engineering an RBAC system
  ahead of any product requirement for it would repeat the mistake this
  project has been careful to avoid elsewhere (see: no generic Comment
  history abstraction, no generic Sheet primitive, no speculative
  `hooks/`/`services/`/`stores/` directories).
- **No "account" vs. "profile" split.** V1's `User` model already
  conflates these reasonably (name, email, passwordHash, role, bio) and
  nothing about Authentication demands separating them.

---

## 4. How should `actorContext` connect to authenticated identity?

This is the crux of the milestone, and it's already half-specified by
what Phase D deliberately did *not* do:

> "Services never decode JWTs, read headers, or query session state."
> (`decision-register.md`, Phase D section)

That boundary must hold. The shape is already fixed:
**`actorContext = { id, role }`**, matching exactly what every service
function (`createIssue`, `changeStatus`, `createKnowledge`, etc.)
already destructures.

Proposed flow (Express middleware, not service-layer):

```
Request → auth middleware → resolves actorContext → attaches to req →
controller reads req.actorContext → calls service(actorContext, ...)
```

The middleware's job, and only its job:

1. Extract the authentication token/session identifier from the
   configured HttpOnly cookie (L2 — locked). Browser authentication is
   cookie-only; there is no `Authorization` header path to support for
   browser clients.
2. Verify/decode it.
3. **Look up the User by ID and read its *current* role from the
   database** — this is the one thing V1 explicitly got wrong ("JWT
   middleware trusts decoded payload without DB lookup," per the
   original context-transfer's V1 findings). If a user's role is
   revoked or their account is otherwise invalidated, a stale JWT claim
   must not keep granting the old role.
4. Attach `{ id, role }` to the request as `actorContext`. Nothing else.

**Anonymous requests remain valid requests** — Product Invariant 5
requires this. The middleware should not force-fail on a missing
token for routes that don't require identity (Explore browsing, reading
approved Knowledge). It should populate `actorContext = null` (or leave
it unset) and let route-level logic decide whether that route requires
one, calling `requireActor()` — which already exists in every service
file — to get the existing, already-tested `UNAUTHORIZED` error.

**Services do not change.** They already require an `actorContext`
matching this exact shape and already throw `UNAUTHORIZED` /`FORBIDDEN`
correctly given one. Authentication's entire job is producing a
trustworthy one; it must resist any temptation to "simplify" by having
controllers reach into services differently, or by loosening the
opaque-boundary discipline Phase D established.

---

## 5. Where should authorization boundaries live?

Nowhere new. This is worth stating explicitly because "let's add auth"
is exactly the kind of task that invites boundary creep.

- **Route/middleware layer**: authentication only — "is there a valid
  session, and if so, who is it." Coarse route-level gating is
  acceptable here (e.g., a middleware that 401s if `actorContext` is
  null on a route that Product Invariant 6 says requires an account),
  but nothing role- or domain-specific.
- **Service layer**: all domain authorization, exactly as today.
  EXPERT-only review, `resolverId !== verifierId`, D-3a's
  `AUTHORIZATION_POLICY_UNRESOLVED`, ownership checks — none of this
  moves. Authentication must not duplicate or shadow any of it in
  middleware "for convenience" or "to fail fast."
- **Route Handlers (Next.js) stay out of this entirely** — ADR-0002
  already assigns authentication/authorization to Express, not Next.js
  Route Handlers, and nothing about this milestone changes that split.

The only new boundary is the one between "raw request" and
"`actorContext`" — everything on the far side of that boundary already
exists and already works.

---

## 6. How do we avoid prematurely resolving D-3a while introducing
   authentication?

This is the sharpest risk in the whole milestone, so being explicit
matters more than being brief.

**The trap:** building login/session naturally produces a working,
trustworthy `actorContext.role` for the first time. It will be *very*
tempting to look at `changeStatus()`'s unconditional
`AUTHORIZATION_POLICY_UNRESOLVED` throw and think "well, now that we
have real roles, obviously EXPERT (or ADMIN, or the Issue's reporter)
should be allowed to do this" — and quietly turn that error into a role
check as part of "wiring up real auth."

**That is exactly the invented resolution the decision register already
forbids.** D-3a is not "unresolved because we lack a role system." It's
unresolved because *no design session has decided the actual mechanism*
(automatic-by-creator? automatic-by-contributor? explicit assignment?
EXPERT/ADMIN-only? some combination?) — candidates are recorded but none
selected, and the register is explicit that inventing an answer via a
`REMEDIATOR` role, an assignment system, or Project-membership authority
does not count as resolving it.

**Concrete guardrails for this milestone:**

- Authentication must not touch `issue.service.js`'s `authorizeTransition`
  function or the `AUTHORIZATION_POLICY_UNRESOLVED` throw, at all, for
  any reason. If Authentication's own test suite needs an Issue to reach
  `resolved` or beyond, it should do so the same way Phase D's tests do
  — via direct model manipulation (`forceStatus`-equivalent), not via a
  newly-unlocked service call.
- If real end-to-end testing of Authentication surfaces a *product* need
  to actually move Issues through `acknowledged → in_progress` (e.g. to
  demo something), the answer is "that path is intentionally blocked
  today," not "let's unblock it as a side effect."
  Any resolution proposal for D-3a, whenever it comes, must be a Project/Act
  authorization design session, not a byproduct of an Authentication PR.
- The Authentication milestone's own decision-register section should
  explicitly restate D-3a's unresolved status, the same way Persistence
  Design and Phase D's sections both did — not because the rule changed,
  but because restating it at every milestone boundary is what has kept
  this project from drifting so far.

---

## 7. What changes are required across each area?

### User model

Likely minimal, possibly none. Candidates that may be needed (to be
confirmed during actual design, not decided here):

- Nothing new is *strictly* required to support access tokens (JWT is
  stateless by construction).
- **If** a refresh-token mechanism is chosen (see below), it needs
  *somewhere* to record valid/revoked refresh tokens. Options: a field
  on `User` (e.g., a hashed current refresh-token or a short array), or
  a separate `Session`/`RefreshToken` collection. This is a real design
  decision, not one to make casually — a new collection is a schema
  change of the same weight as the original five, and should go through
  the same Persistence Design-style scrutiny, not get added as an
  Authentication side effect. **Flagging as an open sub-decision, not
  resolving it here.**
- No `status`/`isActive` field — stays deferred, per §2.

### Authentication services

New `server/src/services/auth.service.js` (or similar), following the
exact same conventions Phase D already established:

- Same `DomainError`/`DomainErrorCode` contract. Likely needs its own
  codes for auth-specific failures (e.g. `INVALID_CREDENTIALS`,
  `EMAIL_ALREADY_REGISTERED`) rather than overloading existing ones —
  `UNAUTHORIZED` currently means "actorContext missing," which is a
  distinct concept from "credentials were wrong."
- Same actor-context-is-opaque-input discipline for any service
  function that isn't *itself* producing that context (i.e., `login`
  and `register` are the exception — they're the one place identity
  gets minted, not consumed).
- Password hashing (bcrypt or equivalent) lives here, not in the model,
  not in middleware.

### Middleware

New Express middleware (`server/src/middleware/auth.js` or similar) per
§4's flow: extract → verify → DB-lookup-for-current-role → attach
`actorContext`. Should be the *only* place JWT/session mechanics are
touched outside `auth.service.js`.

### Routes/controllers

Out of scope for this milestone's core work per the existing sequencing
question (Authentication vs. routes) — but Authentication does need
*some* routes to exist to be testable at all (`POST /auth/register`,
`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`). These four are
the minimum surface, not a general controller layer for Issue/Knowledge/
Comment/Project — those stay genuinely deferred to a real Routes
milestone that wires the nine already-tested service operations.

### Token/session handling

**Locked (L2):** both access and refresh tokens are `HttpOnly` cookies.
No `localStorage`, no frontend-managed bearer headers.

Still open, informed by L1 (separated deployment) and L3 (proportionate
security):

- Exact cookie attributes (`SameSite`, `Secure`, `domain`) for the
  Topology B split — needs the actual deployment targets (e.g. is the
  frontend on one subdomain and the API on another, under a shared
  parent domain, or genuinely cross-site?) to pick `SameSite=None` +
  `Secure` vs. `SameSite=Lax` with a shared parent domain. **Flagging as
  a remaining unresolved decision, not answering it here** — see below.
- **Refresh-token state storage** — User-embedded field vs. dedicated
  collection. Still the single most consequential open item. See
  "Remaining Unresolved Decisions" below.
- **JWT payload**: `{ sub: userId }` only. **Not** `{ sub, role }` — this
  is what forces the DB lookup in §4's middleware step, which is the
  specific V1 mistake being corrected. If role rides in the token itself,
  it's tempting to skip the DB read and every V1 problem reappears. Not
  yet locked by the Principal Architect's three decisions, but carried
  forward unchanged since nothing in L1–L3 argues against it — flagged
  for explicit confirmation rather than assumed.

### Existing service interfaces

**No changes.** This is worth stating as a design constraint, not just
an observation: if implementing Authentication turns out to require
changing `issue.service.js`, `knowledge.service.js`,
`comment.service.js`, or `project.service.js`'s signatures or behavior,
that's a signal the boundary is being violated, not a signal those
files need updating. `actorContext = { id, role }` was designed as a
stable contract for exactly this milestone to fill in.

---

## 8. What must explicitly not be built yet?

- Password reset / forgot-password (§2)
- Full refresh-token rotation with device tracking/revocation lists (§7)
- Expert role acquisition mechanism (§2, already deferred)
- Account suspension/deactivation (§2, already deferred)
- OAuth/social login, MFA, magic links (§2)
- Any resolution, partial resolution, or de-facto resolution of D-3a
  (§6) — including via role checks, Project-membership checks, or any
  other mechanism added to `changeStatus()`'s authorization logic
- Any Issue/Knowledge/Comment/Project routes or controllers — only the
  four auth routes listed in §7 are in scope
- A generic RBAC/permissions collection or abstraction beyond the
  existing flat `role` enum (§3) — no current requirement justifies it
- Any change to Next.js Route Handlers to perform authentication —
  ADR-0002's split stands unchanged

---

## Summary

Authentication is the correct next milestone, confirming rather than
revising the original plan. Its scope is identity and session
construction only: registration, login, logout, `/me`, and a middleware
that turns a request into the existing `actorContext = { id, role }`
shape every service already consumes. No service, model, or
authorization logic already built needs to change. The single sharpest
risk is D-3a getting quietly resolved as a side effect of "now we have
real roles" — guarded against explicitly in §6.

Three decisions are now locked (deployment topology, HttpOnly-cookie
transport, proportionate security posture — see "Locked by this review"
above). Remaining unresolved decisions, including the refresh-token
storage question, are tracked in the standalone report produced for
this review: see the accompanying architecture decision report.

