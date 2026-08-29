# Decision register

This is the single canonical decision register for AquaVeda v2,
consolidating decisions from the Domain Model, Persistence Design, and
Phase D (service implementation) milestones. It was previously split
across two files (`docs/domain/decision-register.md` and this file);
that split was accidental, not an intentional two-register architecture,
and the files had begun to drift. This document supersedes both.

Domain Model milestone: produced through a staged review — full
entity-by-entity analysis → four decision clusters (Issue lifecycle,
Knowledge lifecycle, Issue↔Project, Recommendation), each proposed and
reviewed independently → cross-entity consistency review.

Persistence Design milestone: mapped the settled domain model onto
MongoDB/Mongoose without foreclosing anything left open above, then
underwent its own ADR assessment.

Phase D milestone: implemented and tested the five domain service
operations against the approved persistence schemas. Verified end-to-end
against real MongoDB, not just written — see below.

D-3a remains unresolved (see below) and is unaffected by Persistence
Design's or Phase D's completion — this register is not a record of a
fully closed project state, only of the decisions made so far.

## 🔒 Locked — Domain Model (see ADR-0003, ADR-0004, `domain-model.md`)

- Issue lifecycle: 5-state graph, transition authority, `resolverId !==
  verifierId`, EXPERT-only verification, `acknowledged` mandatory,
  failed-verification routes to `in_progress` only, `verified` terminal
  for V2.
- Knowledge lifecycle: `draft → pending_review → approved | rejected →
  draft`, EXPERT-only review authority, `reviewerId !== authorId`,
  mandatory rejection feedback, content locked during `pending_review`, no
  re-review of approved content in V2.
- Issue ↔ Project: `Issue 0..* Project`, immutable required origin
  reference, creation gated to Issue status ∈ `{acknowledged, in_progress,
  resolved, verified}`, independent ownership, independent lifecycles, no
  automatic Issue authority from Project membership.
- Recommendation: derived service output, no persistence, no
  ownership/lifecycle/authority, Invariant 7 as a service-boundary
  authority contract (not conflict detection), reasoning required on every
  response.
- Cross-entity principle: ownership, participation, contribution,
  governance, and domain verification are distinct and never inferred
  from one another without an explicit rule.

## 🔒 Locked — Persistence Design (see ADR-0005, ADR-0006, `persistence-design.md`)

- Five collections: User, Issue, Knowledge, Comment, Project. Recommendation
  is not persisted, confirming the Domain Model conclusion held under
  persistence-level scrutiny.
- `Issue.statusHistory` and `Knowledge.reviewHistory` are embedded
  subdocument arrays on their parent documents — not separate collections,
  not a shared generic history abstraction (consistent with the Domain
  Model milestone's rejection of a generic history primitive, ADR-0005).
- `Issue.statusHistory` includes the initial creation entry —
  `{fromStatus: null, toStatus: "open", actor: reportedBy, timestamp:
  createdAt}` — so it is the complete lifecycle log, not just
  post-creation transitions. `Knowledge.reviewHistory` records review
  decisions only (approve/reject), with no synthetic entry for
  `draft`/`pending_review`.
- Resolver, verifier, and reviewer identity live only inside history
  entries — no flat `resolvedBy`, `verifiedBy`, or `reviewer` field on
  either entity. The `resolved → verified` authorization check derives
  the resolver's identity by reading the most recent `statusHistory`
  entry at verification time, never from a stored field.
- Knowledge review-history embedding rests on a **V2 capacity assumption**
  (not domain-bounded, since revision cycles have no cap) — named
  reconsideration conditions are recorded in ADR-0005, not treated as
  permanent.
- Project↔Issue: reference held on `Project` (`originIssue`), not an array
  on `Issue` — avoids the same unbounded-array pattern already corrected
  once in v1 (`Issue.comments[]`).
- Project `contributors`: embedded `ObjectId` array. Explicitly does not
  grant, resolve, or imply any Issue lifecycle authority, and does not
  resolve D-3a.
- Comment `parentComment`: one-level nesting is a service/domain
  validation rule, not a schema constraint; no `parentComment` index
  proposed, since no established access pattern queries it directly.
- `Comment.refType` uses `"WIKI"` for Knowledge-targeted comments, not
  `"KNOWLEDGE"` — deliberate, carried forward from v1's proven API shape,
  not an inconsistency to "fix."
- Lifecycle transitions on Issue and Knowledge use conditional
  state-conditioned atomic writes (expected-state-gated updates), not a
  generic version field, for the currently identified concurrency class —
  scoped explicitly, not a blanket rejection of optimistic concurrency
  elsewhere.
- No multi-document transactions required under the current model — a
  direct consequence of embedded history and reference-only relationships,
  not an independent policy.
- `resolverId !== verifierId` and `reviewerId !== authorId` are service-
  layer invariants, not schema-enforceable — `immutable: true` on
  `reportedBy`/`author`/`originIssue` is defense-in-depth only, not the
  primary enforcement mechanism.
- Validation boundary split: Mongoose enforces structural GeoJSON shape
  only (`type: "Point"`, 2-tuple `coordinates`); geographic-range
  validation (longitude ∈ [-180, 180], latitude ∈ [-90, 90]) is owned by
  the Zod schema at the API boundary, not the Mongoose schema — see
  `server/src/validation/issue.validation.js`. Consistent with the
  general Zod-vs-Mongoose split in `persistence-design.md`: Zod validates
  input DTOs from the network, Mongoose enforces index-backed constraints
  and BSON-level storage shape, business logic lives in services.

## 🔒 Locked — Phase D (service implementation, verified)

Verified end-to-end against real MongoDB: `npm run verify:models`
(38/38), `npm run verify:validation` (44/44), `npm test` — full service
suite green, including all three concurrency tests (Issue
`open → acknowledged` race, Issue `resolved → verified` race, Knowledge
`approve`/`reject` race).

- **Five service operations implemented and tested**, one file per
  entity under `server/src/services/`:
  - `issue.service.js` — `createIssue`, `changeStatus`
  - `knowledge.service.js` — `createKnowledge`, `submitForReview`,
    `approve`, `reject`, `revise`
  - `comment.service.js` — `createComment`
  - `project.service.js` — `createProject`
- **Error contract**: one `DomainError` class, one `code` field.
  `DomainErrorCode` values: `VALIDATION_FAILED`, `NOT_FOUND`,
  `UNAUTHORIZED` (missing actor identity only), `FORBIDDEN` (identified
  actor, insufficient permission), `INVALID_STATE`, `INVALID_PARENT`,
  `TARGET_NOT_FOUND`, `STATE_RACE`, `AUTHORIZATION_POLICY_UNRESOLVED`
  (D-3a's concrete representation in code — see below).
- **`AUTHORIZATION_POLICY_UNRESOLVED` is D-3a made concrete.**
  `changeStatus()` throws this error, distinct from `FORBIDDEN`, for
  every attempt at `acknowledged → in_progress` or `in_progress →
  resolved`, unconditionally, for every role. No one can move an Issue
  past `acknowledged` through the service layer. This is working-as-
  designed, not a bug — do not close it by inventing a `REMEDIATOR`
  role, Project-membership authority, or any assignment model. D-3a is
  resolved only by a future Project/Act authorization design session.
- **Actor context boundary**: every service function takes
  `actorContext = { id, role }` as an opaque input. Services never
  decode JWTs, read headers, or query session state — authenticating a
  request and producing `actorContext` is Authentication's job, not
  Phase D's.
- **D-COMMENT-1 (locked)**: a reply must target the exact same
  `(refType, refId)` as its parent. Cross-target replies and
  reply-to-reply are both rejected. Implemented and tested.
- **CastError translation**: every service's first read of a
  caller-supplied ID is wrapped in try/catch, translating a malformed-ID
  Mongoose `CastError` into `DomainError(VALIDATION_FAILED)`, via the
  existing `wrapMongooseValidationError` helper already present in each
  file. Necessary because no Zod/route boundary exists yet to guarantee
  valid ID shape before services are called.
- **Env loading is anchored in `server/src/config/db.js`, not
  `server/src/server.js`.** `dotenv/config` is imported inside `db.js`
  itself, and `connectDB()` takes an explicit `{ envVar }` param
  (default `"MONGO_URI"`). Any code path that needs the database —
  `server.js` at app startup, `tests/helpers/testDb.js` at test
  setup, or any future script — gets a populated `process.env`
  automatically, because all of them ultimately import `db.js`.
  - **Problem this fixed:** `dotenv/config` was previously imported
    only in `server.js`. The test suite imports `db.js` directly via
    `testDb.js` and never touches `server.js`, so `process.env` was
    never populated when running `npm test` — failing with `Missing
    required environment variable: MONGO_URI` even though `.env` was
    correct and the app connected fine under `npm start`.
  - **Do not** remove the `dotenv/config` import from `db.js` as
    apparently-unused or redundant with `server.js`'s own import — it
    is the reason tests (and any other non-`server.js` entry point)
    receive environment variables at all.
- **Tests use `TEST_MONGO_URI`, never `MONGO_URI`, with an enforced
  guard, not just a convention.** `setupTestDb()` calls
  `connectDB({ envVar: "TEST_MONGO_URI" })` explicitly and throws
  before connecting if `TEST_MONGO_URI === MONGO_URI`. This is a
  runtime check, not documentation-only, specifically so a
  misconfigured `.env` can't cause a test run to operate on the
  development database.
- **Test discovery convention**: executable test files are named
  `*.test.js` anywhere under `server/tests/`, run via
  `node --test --test-concurrency=1 "tests/**/*.test.js"`. Non-test
  helpers (e.g. `tests/helpers/testDb.js`) are excluded by the glob,
  not by naming discipline alone.

## ⏸️ Deferred

| Item | Note |
|---|---|
| User suspension/deactivation | No current requirement; adding a status field now would be speculative |
| Expert role acquisition mechanism | Belongs to the Authentication/Governance milestone — `role: EXPERT` as a fact is established, the assignment *process* is not |
| Comment deletion (soft/hard) | No v1 precedent, no current requirement |
| Project status field | Explicitly decided against for V2; revisit only if the Act milestone proves a need |
| Leaving a project | No v1 precedent, no current requirement |
| Admin governance of already-approved Knowledge | Real future need, not solved by extending approval authority now |
| Re-review of approved Knowledge | Out of scope for V2 |
| Issue recurrence / reopening `verified` | Parked; a future `relatedIssue` reference is the likely shape, not un-terminaling `verified` |

## 🔧 Implementation detail (resolved when the relevant schema is written, no ADR needed)

- Issue `category`: enum vs. freeform representation.

## 🟢 Established (already correct, not reopened)

- One-level comment threading (carried from v1, no pressure to change).
- Dashboard data stays fully derived via aggregation, no persistence.

## 📝 Documentation tasks (not decisions)

- Invariant-7 wording in `domain-model.md` — written as an authority
  contract, not a UI-framing note. Done.
- Plural "Projects originating from an Issue" phrasing enforced throughout
  `domain-model.md` and future docs, to prevent drift back toward an
  implied `0..1` relationship. Done.

## 🟡 The only unresolved domain dependency

**D-3a — Remediation-assertion authority.**

The Issue lifecycle (ADR-0003) requires `acknowledged → in_progress` and
`in_progress → resolved` to be performed by an "authorized remediation
actor." The mechanism by which a user obtains that authority is not
resolved by the Domain Model milestone, and neither Persistence Design's
nor Phase D's completion changes that:

- The `actor` field on relevant history entries (ADR-0005) is a plain
  `ObjectId ref User`, not role-gated or tied to Project membership,
  specifically so this remains a service-layer decision to make later
  rather than a schema decision already made.
- At the service layer, `changeStatus()` represents this as the
  dedicated `AUTHORIZATION_POLICY_UNRESOLVED` error code (distinct from
  `FORBIDDEN`), thrown unconditionally for both gated transitions, for
  every role. This must not be converted into `FORBIDDEN`, a role rule,
  Project-ownership authority, contributor authority, or any other
  invented authorization mechanism as part of unrelated work.

Status:

- Does not block `domain-model.md`, ADR-0003, ADR-0005, or ADR-0006 from
  documenting the rest of the Issue lifecycle and its persistence.
- Does not block Phase D's service implementation — the unresolved
  transitions are simply unreachable through the service layer today,
  which is intentional, working-as-designed behavior, not a bug.
- Does block final closure of the Issue authority matrix.
- To be resolved during Project/Act authorization design, once an actual
  Project membership/authorization model exists to attach an answer to.
- Explicitly not resolved by: inventing a `REMEDIATOR` role, an
  explicit-assignment system, or granting automatic authority from Project
  creator/contributor status. Persistence Design (`persistence-design.md`
  §3) restates this explicitly for the `contributors` array specifically.

Candidate models on record for that future design session (none selected):
automatic-by-creator, automatic-by-contributor, explicit assignment,
EXPERT/ADMIN-only, or a combination.

## 🟠 Proposed — not yet locked

**Next milestone: Authentication.** Proposed to build real
session/identity so service calls receive a real `actorContext` instead
of a hand-constructed test fixture, and to sequence it ahead of API
routes/controllers so routes are never tempted to stub identity inline.

This is a **proposal only** — it has not gone through this project's
review → correction → lock cycle with the Principal Architect. Do not
treat it as a locked architectural decision until that review happens
and this section is updated to reflect the outcome.
