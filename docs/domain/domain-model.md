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
Independently real whether or not a Project exists around it.
Status lifecycle: `open → acknowledged → in_progress → resolved → verified`.
Carries a `domain` field defaulting to `"water"` — the schema doesn't
assume water is the only thing ever reportable.

## Knowledge — *Learn milestone*
A moderated article. Draft until expert/admin-approved, then public.
Author-owned while pending.

## Comment — *shared primitive, first built at Explore, reused at Learn*
Attached to either an Issue or a Knowledge article via a `refType`
discriminator. Built once, mounted in two places. "Community" is a view
over this primitive, not where it's implemented.

## Project — *Act milestone*
Created from an Issue, never standalone. Has contributors and
creator-controlled progress tracking.

## Recommendation — *AI milestone*
Output of the rule engine (and later, optionally, an LLM layer) attached
to an Issue. Must carry its reasoning (Product Law 3).


---

Product Invariants and Product Laws live in `docs/vision/product-invariants.md`.
They are listed there rather than here because they are constitutional rules
that survive any restructuring of the domain model itself.
