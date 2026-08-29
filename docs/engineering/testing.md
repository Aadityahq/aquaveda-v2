# Testing Strategy

Scoped for a solo build — enough coverage to catch real regressions,
not enough process to become a second job.

## Tools (not yet installed — added at the milestone that needs them)

| Layer        | Tool                  | Added at                          |
| ------------ | --------------------- | --------------------------------- |
| Unit / logic | Vitest                | Domain Model milestone            |
| Component    | React Testing Library | Auth milestone                    |
| End-to-end   | Playwright            | After first real user flow exists |

## What gets tested at each level

- **Pure functions in `lib/`** — unit tests. Fast, cheap, catches the most
  regressions per line of test code.
- **Client Components with real interaction logic** — component tests with
  RTL. Tests behavior from the user's perspective, not implementation.
- **Full user flows** — Playwright e2e. The only layer that validates
  Server + Client together across the real network boundary.
- **UI primitives** (`button`, `card`, etc.) — not tested directly.
  They're thin enough that testing them tests React, not AquaVeda.
  Covered indirectly by every e2e spec that renders a page using them.

## What "Tested" means for Definition of Done

Non-trivial pure logic → unit test.
Primary user flow of a feature → at least one e2e spec.
100% line coverage is not a target — it produces tests that assert
implementation details rather than behavior.
