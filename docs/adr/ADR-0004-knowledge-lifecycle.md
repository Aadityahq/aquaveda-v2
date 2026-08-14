# ADR-0004: Knowledge moderation lifecycle

## Status
Accepted.

## Context

V1 implemented `draft → pending_review → approved | rejected` with
`rejected` as a terminal state — a contributor whose article was rejected
had no path back to `draft` and had to start over. V1 also granted both
EXPERT and ADMIN approval/rejection authority. Neither of these was
re-examined for v2 until this review, arrived at through the same staged
domain-analysis process as ADR-0003.

Knowledge is the entity the original SIH 1690 problem statement is
centered on — a wiki-style, digital knowledge-sharing platform for
water-conservation techniques, with "Verified Expert Contributions" named
explicitly as a pillar of the proposed solution. The moderation model
therefore carries more product weight than a typical CRUD approval flow.

## Decision

### State semantics

| State | Meaning |
|---|---|
| `draft` | Author is composing or editing. Not visible to anyone but the author. |
| `pending_review` | Submitted for review. Content is locked — the author cannot edit while a decision is pending. |
| `approved` | An authorized Expert has reviewed the submitted content and judged it suitable for public publication under the platform's *current* quality and accuracy standards. Not a claim of permanent or universal truth. |
| `rejected` | An authorized Expert has determined this specific submission does not meet that bar. A statement about the submission, not a permanent judgment on the author or the topic. |

### Transition graph

```
draft ──submit──→ pending_review ──approve──→ approved (terminal in V2)
   ▲                    │
   │                 reject
   │                    ▼
   └──────revise──── rejected
```

Rejection is **revision-capable, not terminal.** A rejected article returns
to `draft` on the same entity — no separate submission, version, or
revision entity is introduced. The domain requirement is narrower than
full version history: give the author a path back to editing so they can
act on feedback. Nothing in current requirements needs to compare
submission N to submission N-1 or show a diff.

### Invalid transitions (explicit, not merely unimplemented)

- `draft → approved` — moderation cannot be bypassed (Product Invariant 2,
  no exceptions).
- `draft → rejected` — nothing has been submitted to reject.
- `rejected → approved` — must pass through `draft` and a fresh
  `pending_review` cycle; no direct override.
- `approved → pending_review` — re-review of already-public content is out
  of scope for V2 (see Consequences).
- Editing while `pending_review` — locked. A reviewer must evaluate the
  exact content they're reviewing; allowing concurrent edits makes "what
  was actually approved" ambiguous.

### Review authority

Approval and rejection require an authorized **EXPERT**. ADMIN does not
hold Knowledge quality-approval authority — this follows Product Invariant
9's separation of expert domain authority from admin platform governance,
applied the same way it's applied to Issue verification in ADR-0003.
`approved` is defined above as an assertion that content meets the
platform's quality/accuracy bar; that is a domain-quality judgment, and
ADMIN's platform-governance role does not imply competence to make it.

V1 granted both EXPERT and ADMIN this authority. That is treated as legacy
behavior, not a binding requirement for V2 — per the project's
reconstruction rule, V1 is a reference implementation, not the source of
truth, and broader authority in the legacy system is not itself evidence
that the broader authority was correct.

**Hard invariant: `reviewerId !== authorId`.** An author — regardless of
role, including an EXPERT author — cannot approve or reject their own
submission. Without this, moderation could be technically satisfied while
being semantically an author certifying their own work.

### Rejection feedback

Rejection requires actionable feedback. This follows directly from
revision being allowed: sending an author back to `draft` with no
information about what needs fixing makes the revision path functionally
equivalent to terminal rejection. This is a domain requirement (revision
only means something if the author can act on it); the persisted shape of
that feedback (a single field, structured categories, etc.) is deferred to
persistence design.

### Review history

Review history has domain significance, for two reasons: accountability
(who approved/rejected, when) and support for the revision loop (what did
the author need to fix). As with ADR-0003, the domain requirement is that
this information exists — whether it's an embedded field or a separate
record is not decided here.

## Why

- Terminal rejection conflates "this submission wasn't good enough" with
  "this contributor is done here," which nothing in the domain actually
  asserts. A wiki-style, collaborative platform whose own founding brief
  emphasizes community contribution shouldn't punish incomplete-but-good-
  faith submissions the same as it would bad ones.
- Reusing the same entity for revision (rather than introducing a
  Submission/Version concept) is the minimum machinery that satisfies the
  actual requirement, consistent with this project's stance against
  premature abstraction.
- `reviewerId !== authorId` closes the same class of hole that
  `resolverId !== verifierId` closes in ADR-0003 — independent confirmation
  is meaningless if the confirmer and the claimant can be the same person.

## Alternatives considered

- **Terminal rejection** (v1's actual behavior) — rejected: no domain
  justification found for treating rejection as final given Invariant 2 is
  about gating publication quality, not about limiting how many attempts a
  contributor gets.
- **Separate Submission/Version entity for revisions** — rejected as
  premature: no current requirement needs submission comparison, diffing,
  or rejection-count tracking. Revisit only if such a requirement emerges.
- **EXPERT-or-ADMIN Knowledge approval** (V1's actual behavior) —
  considered and rejected. `approved` asserts a domain-quality judgment,
  which is EXPERT's authority under Invariant 9, not ADMIN's. V1 granting
  both roles this power is legacy behavior, not evidence it was the
  correct design.

## Consequences

- Admin governance of an already-*approved* article that later surfaces a
  policy problem is a real future need but is explicitly not solved here —
  it's a separate, deferred moderation-lifecycle concept, not a reason to
  grant ADMIN quality-approval authority now. Parked in
  `docs/future/parking-lot.md` if/when it becomes concrete.
- Re-review of approved content (e.g., an approved article whose guidance
  becomes outdated) is out of scope for V2 and parked alongside the above.
- Persistence design (feedback field shape, review history shape) follows
  this ADR and is not addressed here.
