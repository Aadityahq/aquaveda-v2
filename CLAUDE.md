@AGENTS.md

# AquaVeda Progress

## Current Milestone

Domain Model (decision phase) — **COMPLETE**

Domain analysis, entity-by-entity review, and four decision clusters
(Issue lifecycle, Knowledge lifecycle, Issue↔Project, Recommendation) are
resolved and cross-checked for consistency. This covers domain decisions
only — no Mongoose schemas, models, or persistence code exist yet.

## Completed

### Domain Model Decision Phase
- Full entity-by-entity Domain Model Analysis (User, Issue, Knowledge,
  Comment, Project, Recommendation)
- Issue status lifecycle resolved and documented in `docs/adr/ADR-0003-issue-lifecycle.md`
- Knowledge moderation lifecycle resolved and documented in `docs/adr/ADR-0004-knowledge-lifecycle.md`
- Issue↔Project relationship (cardinality, ownership, authority) resolved
  in `docs/domain/domain-model.md`
- Recommendation resolved as a derived, non-persisted service output
- Cross-entity consistency review performed — no contradictions found
- `docs/domain/decision-register.md` records the full disposition: locked
  decisions, deferred items, implementation details, and the one
  remaining open dependency
- `docs/domain/domain-model.md` updated with resolved lifecycles and the
  cross-entity principle (ownership/participation/contribution/governance/
  verification are distinct forms of authority)

**Open dependency carried forward, not resolved:** D-3a — the mechanism by
which a user becomes an authorized remediation actor for
`acknowledged → in_progress` and `in_progress → resolved` is deferred to
the Project/Act authorization design. No role, assignment model, or
membership-based authority has been invented to close it. This blocks
final closure of the Issue authority matrix; it does not block persistence
design from proceeding.

### Foundation Slice
- Root app shell: `layout.tsx` with metadata, fonts (Space Grotesk,
  IBM Plex Sans, IBM Plex Mono via `next/font/google`), Navbar, Footer
- ThemeProvider boundary (Client Component, isolated from Server layout)
- Route-level states: `loading.tsx`, `error.tsx`, `not-found.tsx`
- Design token system in `globals.css`: full named palette + semantic
  tokens, light and dark mode, `@theme inline` Tailwind v4 bridge,
  `contour-rule` utility, `prefers-reduced-motion` override
- One real Server → Client data loop: `getSystemSnapshot()` in `lib/system.ts`
  → `/api/system` Route Handler → `FoundationStatusCard` (server-seeded)
  → `FoundationRefreshButton` (client refetch via `useTransition`)

### UI Primitives
- `Button` (variant + size CVA, `asChild` via Radix Slot)
- `Card` + `CardHeader` + `CardTitle` + `CardDescription` + `CardContent` + `CardFooter`
- `Badge` (domain-aware variants: `default`, `verified`, `warning`, `critical`, `outline`)
- `Input`
- `Textarea` (vertical-resize only)
- `Separator` (`role="none"`, decorative)
- `Skeleton` (Server Component, animate-pulse)
- `Avatar` + `AvatarImage` + `AvatarFallback` (Radix-backed)

### Layout
- `Navbar` (Server Component, desktop nav)
- `ThemeToggle` (Client Component, hydration guard, Sun/Moon icons)
- `MobileNav` (Client Component, Radix Dialog drawer, auto-close on route
  change, active link highlight, proper ARIA)
- `Footer`

### Documentation
- `docs/vision/vision.md`
- `docs/vision/principles.md`
- `docs/vision/product-invariants.md` (standalone — constitutional rules
  that survive any domain model restructuring)
- `docs/engineering/standards.md` (coding rules, dependency policy, DoD, commits)
- `docs/engineering/testing.md`
- `docs/adr/ADR-0001-new-repository.md`
- `docs/adr/ADR-0002-backend-architecture.md`
- `docs/adr/ADR-0003-issue-lifecycle.md`
- `docs/adr/ADR-0004-knowledge-lifecycle.md`
- `docs/domain/domain-model.md`
- `docs/domain/decision-register.md`
- `docs/architecture/nextjs-patterns.md`
- `docs/future/parking-lot.md`

### Repository layout
- `server/` sibling directory established with `package.json` and milestone
  build plan in `server/README.md` — backend built here, not in a separate repo.
  Future evolution path: `apps/web` + `apps/server` workspace layout.

## Architectural Decisions

- New repository over in-place migration (ADR-0001)
- Keep Express as separate API service, same repository (ADR-0002)
- Issue status lifecycle: 5-state, EXPERT-only verification,
  resolver≠verifier hard invariant (ADR-0003)
- Knowledge moderation lifecycle: revision-capable rejection, EXPERT-only
  review, reviewer≠author hard invariant (ADR-0004)
- Issue↔Project: `0..*` cardinality, immutable required origin reference,
  no automatic authority from Project membership
- Recommendation: derived service output, not a persisted entity
- Domain/persistence boundary deliberately preserved throughout — domain
  decisions (e.g. "status history has domain significance") are recorded
  separately from persistence-shape decisions (embedded vs. referenced),
  which are explicitly left to the Persistence Design milestone
- Server Components by default; Client Components at the smallest boundary
- Tailwind v4 CSS-first theming; semantic tokens only in components
- Dependency policy: `package.json` reflects what's built today, never what's planned
- `MobileNav` uses Radix Dialog directly — one concrete use case does not
  justify a generic Sheet abstraction yet
- Product Invariants live in `docs/vision/product-invariants.md` separately
  from the domain model — constitutional rules should be findable independently

## Technical Debt

- `not-found.tsx` copy says "hasn't been built yet" — will need updating
  as real routes ship (acceptable for now, honest placeholder)
- `server/` has no code yet — intentional, Persistence Design milestone
  brings the first of it
- **D-3a (remediation-assertion authority) remains unresolved** — not
  technical debt in the usual sense, but an explicitly deferred domain
  dependency. Do not resolve it by inventing a role, assignment model, or
  membership-based authority without a dedicated Project/Act
  authorization design session.

## Next Milestone

**Persistence Design** (analysis phase, precedes schema implementation) —
map the settled domain model onto MongoDB/Mongoose while preserving the
domain decisions in ADR-0003, ADR-0004, and `docs/domain/domain-model.md`.
Entity→collection mapping, embedded-vs-referenced relationships, status/
review-history persistence shape, indexes, and the Zod/Mongoose validation
boundary are analyzed and reviewed before any schema is written.

After Persistence Design: Authentication.

## Reviewer Notes

Design System + Foundation milestone reviewed and rated 9.8/10 (prior review).

Domain Model decision phase reviewed and accepted, with one substantive
correction made during review (Knowledge approval authority corrected from
EXPERT-or-ADMIN to EXPERT-only, to stay consistent with the Issue
verification precedent and Product Invariant 9). Corrected consistently
across `ADR-0004-knowledge-lifecycle.md`, `domain-model.md`, and
`decision-register.md`; verified with a full cross-document consistency
check afterward.

D-3a is the sole remaining open domain dependency. It is intentionally
unresolved, not overlooked — closing it requires a Project/Act
authorization design this project doesn't have yet, and inventing an
answer now would be exactly the premature-abstraction failure mode this
project has been deliberately avoiding.

Ready to begin Persistence Design (analysis phase).
