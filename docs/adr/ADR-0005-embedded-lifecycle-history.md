# ADR-0005: Embedded lifecycle and review history for Issue and Knowledge

## Status
Accepted.

## Context

ADR-0003 established that Issue status history has domain significance —
the `resolved`/`verified` claim-and-confirmation pair is only meaningful
if the system retains enough transition information to preserve
accountability. ADR-0004 established the equivalent for Knowledge:
review decisions (approve/reject) carry reviewer identity and, for
rejections, mandatory actionable feedback. Both ADRs explicitly deferred
the persistence representation of that history to the Persistence Design
milestone.

The Persistence Design analysis (`docs/architecture/persistence-design.md`,
approved) evaluated two structural options for each entity: embedding
history as a subdocument array on the parent document, or storing history
as a separate collection with a foreign key reference. Each entity was
evaluated independently.

This ADR records the persistence decisions for both, their actor-identity
representation, and the transaction implication that follows from those
decisions. It does not re-argue the domain requirements established in
ADR-0003 and ADR-0004.

## Decision

### 1. Issue status history is embedded

`Issue.statusHistory` is an embedded array of subdocuments on the Issue
document. Each entry records one status transition.

**Minimum required fields per entry:**

| Field | Meaning |
|---|---|
| `fromStatus` | The status immediately before this transition |
| `toStatus` | The status after this transition |
| `actor` | Reference to the User who performed the transition |
| `timestamp` | When the transition occurred (explicit field, not Mongoose auto-timestamp, so it unambiguously represents transition time) |

**Initial entry:** `statusHistory` includes an entry for Issue creation,
recording `null → open` with the reporting user as actor and the Issue's
creation timestamp. `statusHistory` is therefore defined as the
**complete lifecycle history of an Issue** — its first entry is an
initialization event, and subsequent entries are state transitions as
defined by ADR-0003. This makes `statusHistory` a self-sufficient
timeline: any consumer needing the full history reads one array rather
than combining the array with separate top-level fields (`reportedBy`,
`createdAt`). The redundancy this creates (both `reportedBy` and the
first history entry reference the same user) is acceptable — both are set
in the same atomic document-creation write and are never independently
maintained afterward.

**Growth:** Issue's lifecycle has five states and one permitted backward
edge (`resolved → in_progress` on failed verification, per ADR-0003).
Even pathological repeated-failure cases produce entries in the low tens.
Document-size growth is not a concern for Issue history.

**Query pattern:** Issue history is always read alongside its parent Issue
(displaying a timeline, building an audit view). No current planned
operation queries status history independently across Issues. This is the
primary justification for embedding rather than referencing.

### 2. Knowledge review history is embedded

`Knowledge.reviewHistory` is an embedded array of subdocuments on the
Knowledge document. Each entry records one review decision.

**Minimum required fields per entry:**

| Field | Meaning |
|---|---|
| `decision` | `approved` or `rejected` |
| `reviewer` | Reference to the Expert who made the decision |
| `feedback` | Required when `decision` is `rejected`; not applicable for `approved` |
| `timestamp` | When the review decision was made (explicit field, not auto-timestamp) |

**Scope of entries:** `reviewHistory` records review *decisions* only —
`approved` and `rejected` events. It does not contain synthetic entries
for `draft` creation or `pending_review` submission. Before any review
has occurred, `reviewHistory` is correctly an empty array. This is a
deliberate asymmetry with Issue's `statusHistory` (which includes the
creation event) — Issue creation is itself a lifecycle transition
(`null → open`) worth recording; Knowledge creation is not a review
decision and does not belong in a review-decision log.

**Capacity: V2 assumption, not domain-bounded.** ADR-0004 places no cap
on how many times a Knowledge article may be rejected and revised —
`rejected → draft → resubmit` may cycle indefinitely. Unlike Issue
history, Knowledge review history is not domain-bounded. Embedding is
chosen here based on a **V2 capacity assumption**: at the platform's
current expected scale, and given that review history is always read
alongside its parent Knowledge document, embedded arrays are expected to
stay within practical document-size limits. This assumption must be
revisited — most likely toward a separate `KnowledgeReview` collection —
if either of the following is observed in practice:

- Revision cycles reach materially higher counts than expected (e.g., a
  moderation workflow that generates many small iterative rejections
  rather than substantive feedback).
- A future feature requires querying review history independently of its
  parent Knowledge document (e.g., a platform-wide "recent moderation
  decisions" view).

**Query pattern:** Knowledge review history is always read alongside its
parent Knowledge document (author reviewing feedback, authorized Expert
reviewing decision history). No current planned operation queries review
history independently across Knowledge articles.

### 3. Actor identity belongs to history entries, not flat entity fields

Resolver, verifier, and reviewer identities are stored only inside the
relevant `statusHistory` or `reviewHistory` entries. No flat
`resolvedBy`, `verifiedBy`, or `reviewer` field is added to the Issue or
Knowledge document at the top level.

**Why:** ADR-0003's lifecycle allows `resolved → in_progress → resolved →
verified` loops on failed verification. A flat `resolvedBy` field would
hold only the most recent resolver — silently dropping the accountability
trail for earlier resolution attempts the moment verification fails and
the cycle repeats. The history entries are the only representation where
actor identity is correctly scoped to the specific transition it belongs
to, not to the entity as a whole.

This trades a small amount of query convenience ("who is the current
verifier?" requires walking the history array rather than reading a flat
field) for correctness. A denormalized flat field that can silently drift
from the history's source of truth is not an acceptable alternative when
the domain requirement is accountability.

The same reasoning applies to Knowledge: a flat `reviewer` field would
represent only the most recent reviewer, losing the history of earlier
decisions in a multi-rejection/revision cycle.

### 4. Current lifecycle operations do not require multi-document transactions

Because Issue status and its history are stored in the same document, and
because Knowledge status and its review history are stored in the same
document, the operations that change lifecycle state and record that
change are inherently single-document writes. MongoDB's single-document
write atomicity guarantees these are all-or-nothing without requiring an
explicit transaction.

This conclusion is a **direct consequence** of the embedding decisions
above. It is not a separate policy that "transactions should be avoided."
If either history structure were later moved to a separate collection,
the atomicity guarantee would not automatically transfer, and transaction
requirements would need to be re-evaluated at that point.

### 5. This ADR does not establish a universal embedding rule

**Nothing in this ADR implies that all future history-bearing entities
must embed their history.** Future entities with lifecycle history must
be evaluated independently, based on their own:

- Access patterns (is history always read with the parent, or queried
  independently?)
- Growth characteristics (is growth domain-bounded, or potentially
  unbounded like Knowledge's?)
- Lifecycle structure (how many transitions? how many backward edges?)
- Document-size risk at expected scale

The decisions above are specific to Issue and Knowledge. A future entity
with unbounded, independently-queried history should reach a different
conclusion — and should do so through its own analysis rather than
inheriting this ADR's decisions by default.

## Why embedding over separate collections (for both entities)

The reasoning for both entities converges on the same two factors:

1. **No independent query requirement exists in the current planned
   product.** History is always read alongside the parent entity. A
   separate collection adds a join without adding query capability.
2. **Growth is manageable** for Issue (domain-bounded) and assumed
   manageable for Knowledge at V2 scale (capacity assumption, explicitly
   caveated above).

If either factor were false, a separate collection would be the correct
choice. These are the conditions, not preferences.

## Alternatives considered

- **Separate `IssueStatusHistory` collection** — rejected: no independent
  query requirement exists today, and it would require an additional
  query to load history alongside every Issue detail view, for no
  identified benefit. Relevant reconsideration trigger documented in §4
  of `persistence-design.md`.
- **Separate `KnowledgeReview` collection** — rejected for V2 on the
  capacity assumption stated above; reconsideration conditions are
  explicitly named and should be treated as live monitoring criteria, not
  as hypotheticals.
- **Flat `resolvedBy`/`verifiedBy`/`reviewer` fields for query
  convenience** — rejected: incorrect under ADR-0003's lifecycle (which
  allows `resolved → in_progress` loops), and introduces a denormalized
  field that can silently diverge from the history's source of truth.
- **Shared generic history collection** — rejected, consistent with
  Domain Model milestone's disposition of D-20: the two history
  structures have different field shapes (`fromStatus/toStatus/actor`
  vs. `decision/reviewer/feedback`), different growth characteristics,
  and different domain meanings. Abstracting them into one structure
  would sacrifice clarity without adding any identifiable query, code-
  reuse, or reporting benefit.

## Consequences

- Issue and Knowledge history consumers must treat `statusHistory` and
  `reviewHistory` as the authoritative accountability records. No
  separate audit-log concept exists.
- "Who resolved/verified/reviewed this?" is answered by walking the
  relevant history array — not by reading a flat field. Service-layer
  and API-response code must account for this when building views that
  surface the most recent actor.
- The Knowledge capacity assumption is a monitored commitment, not a
  permanent guarantee. The reconsideration conditions above should be
  part of any future capacity review.
- The transaction conclusion (§4) is a consequence of this ADR's
  structural choices, not a project-wide "no transactions" policy.
  ADR-0006 addresses the separate concurrency problem that single-
  document atomicity alone does not solve.
