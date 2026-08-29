# Domain Model

Everything in the product is a UI over a small set of primitives.
Thinking in primitives prevents the same concept from being independently
reimplemented in three different modules.

Each primitive lists the milestone that first builds it.

---

## User — *Authentication milestone*
Identity and role. Roles: `USER`, `EXPERT`, `ADMIN`.
Every contribution traces to an account (Product Law 1).

## Issue — *Explore milestone*
A geo-tagged, reported problem. Always has a location (Product Law 2).
Independently real whether or not a Project exists around it. Carries a
`domain` field defaulting to `"water"` — the schema doesn't assume water is
the only thing ever reportable.

Status lifecycle (full rationale in ADR-0003):

```
open ──→ acknowledged ──→ in_progress ──→ resolved
                                ▲             │
                                │             ├─ verification succeeds → verified (terminal)
                                └─────────────┴─ verification fails → in_progress
```

`resolved` is a claim by whoever performed remediation; `verified` is an
independent EXPERT confirmation of that claim (`resolverId !== verifierId`,
a hard invariant). `acknowledged` is mandatory, not skippable — it's the
platform's "an authority has reviewed this" signal, and only means
something if it can't be bypassed. EXPERT holds Issue-verification
authority; ADMIN does not (Invariant 9 — governance authority isn't
domain-quality authority). The domain requires enough status-transition
information to be retained because `resolved`/`verified` accountability
depends on knowing who made which claim and when.

**Open dependency:** `acknowledged → in_progress` and `in_progress →
resolved` both require an "authorized remediation actor," but the
mechanism for obtaining that authority is deferred to the Project/Act
authorization design — see D-3a in the domain decision register. Project
creator/contributor status does **not** by itself grant this authority.

## Knowledge — *Learn milestone*
A moderated article. Draft until expert-approved, then public.
Author-owned while pending. Full rationale in ADR-0004.

```
draft ──submit──→ pending_review ──approve──→ approved (terminal in V2)
   ▲                    │
   │                 reject
   │                    ▼
   └──────revise──── rejected
```

Rejection is revision-capable, not terminal — a rejected article returns to
`draft` on the same entity, not a new submission/version. Rejection
requires actionable feedback, since the revision path only means something
if the author can act on it. Content is locked while `pending_review` — a
reviewer must evaluate exactly what they're reviewing. Approval and
rejection require an authorized **EXPERT**, consistent with Issue
verification in ADR-0003 — ADMIN's platform-governance role does not
imply competence to judge Knowledge quality and accuracy, per Invariant 9.
Hard invariant: `reviewerId !== authorId`, regardless of role — an author
can never approve their own submission.

## Comment — *shared primitive, first built at Explore, reused at Learn*
Attached to either an Issue or a Knowledge article via a `refType`
discriminator. Built once, mounted in two places. "Community" is a view
over this primitive, not where it's implemented.

## Project — *Act milestone*
Created from an Issue, never standalone. Has contributors and
creator-controlled progress tracking. No status/lifecycle field in V2 —
existence, contributors, and progress are sufficient for now.

An Issue may have **zero or more** Projects originating from it — always
write and think in the plural. Multiple Projects around one Issue
represent independent action initiatives (distinct actors, approaches, or
resources), not duplicate records of the same effort. Each Project
references exactly one originating Issue, set at creation and immutable
afterward. Project creation requires the originating Issue's status to be
in `{acknowledged, in_progress, resolved, verified}` — not `open`, since
organizing action around an unreviewed report undercuts what
`acknowledged` is meant to signal.

Issue and Project lifecycles are independent after creation: an Issue
reaching `verified` does not close or complete an associated Project, and
Project ownership (`creator`) is fully independent from Issue ownership
(`reportedBy`) — no inheritance either direction. Project creator or
contributor status does not, by itself, grant any Issue lifecycle
authority (see the Issue section above and D-3a).

## Recommendation — *AI milestone*
A **derived service output, not a persisted entity.** Computed on request
from the rule engine (and later, optionally, an LLM layer) against an
Issue — no `Recommendation` collection, no ownership, no lifecycle, no
authority semantics, since nothing is being asserted by a person that
needs independent confirmation.

Must carry its reasoning alongside its guidance on every response (Product
Law 3) — not merely "which keyword matched," since that would
unnecessarily constrain a future, richer rule engine.

Product Invariant 7 ("AI never overrides verified knowledge") is an
authority contract enforced at the service boundary, not a semantic
conflict-detection requirement: approved Knowledge is authoritative within
the domain; Recommendation is assistive and carries no capability to
alter, invalidate, downgrade, or supersede an approved Knowledge record.
The rule engine has no obligation to compare its output against Knowledge
content — the contract is about what Recommendation *can never do*
(nothing writes to Knowledge from this path), not about detecting
disagreement.

---

## Cross-entity principle

**Ownership, participation, contribution, governance, and domain
verification are distinct forms of authority and must not be inferred
from one another without an explicit domain rule.** This shows up
repeatedly across the model rather than being one entity's quirk: Issue
reporter ≠ Issue verifier, Knowledge author ≠ Knowledge reviewer, Project
creator/contributor ≠ Issue lifecycle authority, and ADMIN is never treated
as a superset of EXPERT capability. Any future feature that appears to
grant authority based on adjacency (e.g. "they're on the Project, so they
must be able to...") should be checked against this principle before being
implemented.

---

Product Invariants and Product Laws live in `docs/vision/product-invariants.md`.
They are listed there rather than here because they are constitutional rules
that survive any restructuring of the domain model itself.

Full lifecycle rationale, alternatives considered, and consequences for
Issue and Knowledge live in `docs/adr/ADR-0003-issue-lifecycle.md` and
`docs/adr/ADR-0004-knowledge-lifecycle.md`. The complete decision record
from the Domain Model milestone — including deferred and dispositioned
items — lives in `docs/architecture/decision-register.md`.
