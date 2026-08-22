# ADR-0006: Conditional state-conditioned atomic lifecycle transitions

## Status
Accepted.

## Context

ADR-0005 establishes that Issue status and its history are stored in the
same document, and that Knowledge status and its review history are stored
in the same document. MongoDB's single-document write atomicity guarantees
that any write to one of these documents is all-or-nothing. This covers
the *persistence* side of lifecycle transitions.

It does not cover a separate, distinct problem: the **read-validate-write
race**.

The service-layer operation for a lifecycle transition necessarily follows
this sequence:

```
1. Read current state
2. Validate: transition is legal for this state
3. Validate: actor has authority for this transition
4. Write: set new state + append history entry
```

Steps 1–3 happen in the service layer before the write. If two actors
(or one actor with a double-submit) both complete steps 1–3 against the
same document before either reaches step 4, both will pass validation
against the same current state and both will then attempt to write — with
the second write proceeding against a document whose state has already
changed.

MongoDB's document-level atomicity guarantees that each individual write
at step 4 is atomic. It does not guarantee that the *state read at step 1*
is still the document's state at the moment step 4 executes. Those are
different guarantees, and conflating them would be a real correctness
failure in the lifecycle implementation.

This ADR defines the mechanism for making lifecycle transitions safe
against this race for Issue and Knowledge, arrived at through the
Persistence Design analysis (`docs/architecture/persistence-design.md`,
approved, §4).

## Decision

### Mechanism: conditional state-conditioned atomic writes

For every **state-conditioned lifecycle operation** on Issue or Knowledge
— including status transitions on Issue and approve/reject decisions on
Knowledge — the database write at step 4 must be structured as a
**conditional atomic update**: the update operation's filter includes
both the document identifier and the **expected current state** — the
same state value that was read at step 1 and validated against at step 2.

**Issue status transition** (e.g. `acknowledged → in_progress`):

```
expectedStatus
      ↓
conditional match on { _id: issueId, status: expectedStatus }
      ↓
atomically:
  - set status = targetStatus
  - append { fromStatus: expectedStatus, toStatus: targetStatus, actor, timestamp }
```

**Knowledge review decision** (approve or reject):

```
expectedStatus        (e.g. "pending_review")
      ↓
conditional match on { _id: knowledgeId, status: expectedStatus }
      ↓
atomically:
  - set status = targetStatus   (e.g. "approved" or "rejected")
  - append { decision, reviewer, feedback?, timestamp }
```

If the filter matches — the document still holds `expectedStatus` at
write time — the state mutation and history-entry append occur as a
single atomic operation. If the filter does not match, the update
matches zero documents. When the document is known to exist and the
transition was already validated as legal at step 2, a zero-document
match indicates that the document's state changed between step 1 and
step 4 — a concurrency race. The service layer must treat this as a
distinct, named outcome: **"state changed underneath you,"** separate
from authorization failure and invalid transition (see failure modes
below). Note: a zero-document match can also indicate the document was
deleted between steps 1 and 4; the service layer must distinguish this
case (document not found) from a state race before reporting an outcome
to the caller.

### The `fromStatus` constraint

The `fromStatus` field recorded in the appended history entry must equal
the `expectedStatus` value supplied to the conditional update's filter.
These are not two independently-set values that happen to usually agree —
they are the same value, used in both the guard condition and the history
record. This ensures the state change and its accountability record share
the same validated precondition. No code path may transition status to
`targetStatus` while recording a `fromStatus` that differs from the state
that was actually validated.

### Distinguishing failure modes

A lifecycle transition operation can fail for three distinct reasons.
This ADR requires that the **service layer** distinguish between them
internally — as three separate, named outcomes — regardless of how they
are eventually represented to an API caller. The specific HTTP status
codes, error shapes, or response envelope used to surface these outcomes
externally are governed by the project's API error contract, not by this
ADR; this ADR's scope is the architectural requirement that the
distinction exist and be preserved through the service layer, not the
wire format:

| Failure mode | Meaning | How detected |
|---|---|---|
| Invalid transition | The requested `targetStatus` is not a legal next state from the current state (per ADR-0003/ADR-0004 transition graphs) | Checked at step 2, before the write |
| Unauthorized actor | The actor does not hold authority for this transition | Checked at step 3, before the write |
| State race | The document's state changed between step 1 and step 4 | Detected by zero-document match from the conditional update at step 4 |

A state-race failure is not an authorization failure and must not be
reported as one. Conflating them would cause callers to incorrectly
conclude that the actor lacked authority, rather than that a concurrent
write occurred and the operation should be retried after reloading state.

### Why not a generic document-wide version field

A generic optimistic-concurrency version field (an integer counter
incremented on every write, checked-and-incremented atomically) was
considered and rejected **for this specific concurrency problem.**

For status transitions, the field under contention is exactly `status`.
Conditioning the write on the expected value of `status` directly encodes
the invariant: "this write is valid only if the state I validated against
is still true." A generic version field achieves the same race protection
but couples the atomic check to a field (`version`) whose semantics are
unrelated to the domain rule being enforced.

**Scope of this rejection:** the rejection of a generic version field
applies to the **currently identified lifecycle-transition concurrency
class** — status-conditioned writes to `Issue.status` and
`Knowledge.status`. It is not a universal rejection of optimistic
concurrency or document-wide versioning for AquaVeda. A future feature
involving concurrent writes to fields where state-conditioning on a
single value is not a natural fit should evaluate a generic version field
(or another appropriate mechanism) on its own merits, independent of
this ADR.

### Concrete implementation is deferred

The exact MongoDB/Mongoose operation that achieves the conditional atomic
update and history-entry append atomically is an implementation detail,
left to schema and service-layer implementation work that follows
persistence-design approval. This ADR specifies the mechanism and its
required properties, not the specific API call.

## Why

The read-validate-write race is real and the consequences of not
addressing it are specific: duplicate history entries for a transition
that should have occurred once, or two concurrent operations both
"winning" a transition to `resolved`, each recording the other actor's
intent as its own — both of which would silently corrupt the
accountability record that ADR-0003 and ADR-0005 require to be accurate.

The conditional state-conditioned update is the minimal mechanism that
eliminates this specific race without introducing machinery the domain
doesn't otherwise need. Single-document atomicity (the guarantee already
provided by embedding, per ADR-0005) handles the write itself; the
conditional filter handles the gap between read and write.

## Applicability

This mechanism applies to:

- **`changeStatus`** on Issue — all transitions in ADR-0003's graph
- **`approve`** and **`reject`** on Knowledge — all review decisions in
  ADR-0004's graph
- Any future lifecycle-transition operation on Issue or Knowledge that
  follows the read-validate-write pattern

It does not apply to operations that do not involve a state-conditioned
write (e.g., joining a Project, creating a Comment) — those operations
have no equivalent precondition to guard against.

## Alternatives considered

- **Generic document-wide version field** — rejected for the currently
  identified concurrency class; see "Why not a generic version field"
  above. Not universally rejected.
- **MongoDB multi-document transactions to wrap the read-validate-write
  sequence** — rejected: transactions introduce coordination overhead and
  require a replica set or sharded cluster configuration; the embedding
  decisions in ADR-0005 already ensure the write itself is single-
  document atomic, so a transaction would be solving a problem that the
  conditional filter already solves more cheaply. Transactions remain an
  option if a future requirement introduces genuine multi-document
  atomicity needs beyond what embedding provides.
- **Application-level locking** — rejected: distributed locks introduce
  infrastructure dependencies and failure modes (lock holder crashes)
  that the conditional update avoids entirely. MongoDB's atomic
  operations are the right layer for this guarantee.
- **Last-write-wins (no concurrency protection)** — rejected: silently
  produces duplicate or incorrect history entries, violating the
  accountability requirement established in ADR-0003 and ADR-0005.

## Consequences

- Service-layer code for `changeStatus`, `approve`, and `reject` must use
  a conditional update (filter includes expected current state) rather
  than a simple `findByIdAndUpdate`.
- A zero-document match from a conditional lifecycle update — after
  confirming the document still exists — must be handled as a distinct
  "state changed underneath you" outcome at the service layer, kept
  architecturally separate from authorization failure and invalid
  transition. How this outcome is represented to an API caller (status
  code, error shape) is determined by the project's API error contract,
  not by this ADR.
- The `fromStatus` field in every appended history entry is the same
  value as the `expectedStatus` in the conditional filter — populated
  from the service layer's validated read, not computed independently at
  write time.
- The concrete MongoDB/Mongoose operation must be chosen at implementation
  time to satisfy: (a) single-document atomicity of state mutation +
  history append, and (b) conditional execution guarded by expected
  current state. These are the two required properties; the specific API
  is implementation detail.
