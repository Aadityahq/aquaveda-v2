# Decision register

Domain Model milestone: produced through a staged review — full
entity-by-entity analysis → four decision clusters (Issue lifecycle,
Knowledge lifecycle, Issue↔Project, Recommendation), each proposed and
reviewed independently → cross-entity consistency review.

Persistence Design milestone: mapped the settled domain model onto
MongoDB/Mongoose without foreclosing anything left open above, then
underwent its own ADR assessment.

D-3a remains unresolved (see below) and is unaffected by Persistence
Design's approval — this register is not a record of a fully closed
project state, only of the decisions made so far.

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
- `Issue.statusHistory` includes the initial `null → open` creation entry;
  `Knowledge.reviewHistory` records review decisions only, with no
  synthetic entry for `draft`/`pending_review`.
- Resolver, verifier, and reviewer identity live only inside history
  entries — no flat `resolvedBy`, `verifiedBy`, or `reviewer` field on
  either entity.
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
resolved by the Domain Model milestone, and Persistence Design's approval
does not change that — the `actor` field on relevant history entries
(ADR-0005) is a plain `ObjectId ref User`, not role-gated or tied to
Project membership, specifically so this remains a service-layer decision
to make later rather than a schema decision already made.

- Does not block `domain-model.md`, ADR-0003, ADR-0005, or ADR-0006 from
  documenting the rest of the Issue lifecycle and its persistence.
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
