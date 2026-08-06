# Testing Strategy

Scoped for a solo build: enough coverage to catch real regressions, not enough process to become a second job.

## Tools

| Layer | Tool | Added at |
|---|---|---|
| Unit / logic | Vitest | Domain Model milestone |
| Component | React Testing Library | Auth milestone |
| End-to-end | Playwright | After first real user flow exists |

## What gets tested

- Pure functions in `lib/` get unit tests.
- Client Components with interaction logic get component tests later.
- Full user flows get Playwright e2e after the framework is added.
- UI primitives are covered indirectly by pages that render them.