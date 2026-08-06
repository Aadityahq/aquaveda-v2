# Principles

Short. If a principle needs a paragraph of caveats, it's a policy.
Policies live in `docs/engineering/standards.md`.

## Future-ready architecture. Present-focused product.

The schema has room for multiple domains. The product ships one.
Extensibility is an architectural property, not a feature roadmap item.

## Nothing is grandfathered in.

The legacy repository is evidence of what works, not authority on how
to build it. For every piece under consideration:
1. Should this exist at all?
2. Is this still the best UX?
3. Can the architecture be simpler?
4. Would we build it this way today?

A "no" to any of these means design a better version.

## Feedback before conviction.

Architecture decided entirely on paper is educated guessing. The
Foundation Slice exists specifically to validate App Router, Server/Client
boundaries, and the design language before 40 pages of docs depend on them.

## Dependency policy: add it when you need it.

A package is added to `package.json` in the same commit as the first file
that imports it — not ahead of the milestone that needs it. `package.json`
is a map of what's actually built, not a wishlist.

## One artifact per kind of truth.

- Durable "why" reasoning → ADR
- Per-milestone status → CLAUDE.md
- Standing rules → `docs/engineering/standards.md`
- Deferred ideas → `docs/future/parking-lot.md`

When two documents could both hold a piece of information, that's a sign
one of them shouldn't exist.

## Definition of Done is not negotiable per-feature.

A feature is done when it passes every line in
`docs/engineering/standards.md`. Lowering the bar "just this once" is how
the bar disappears by feature ten.
