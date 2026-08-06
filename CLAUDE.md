@AGENTS.md

# AquaVeda Progress

## Current Milestone

Design System + Application Foundation — **COMPLETE**

## Completed

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
- `docs/domain/domain-model.md`
- `docs/architecture/nextjs-patterns.md`
- `docs/future/parking-lot.md`

### Repository layout
- `server/` sibling directory established with `package.json` and milestone
  build plan in `server/README.md` — backend built here, not in a separate repo.
  Future evolution path: `apps/web` + `apps/server` workspace layout.

## Architectural Decisions

- New repository over in-place migration (ADR-0001)
- Keep Express as separate API service, same repository (ADR-0002)
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
- `server/` has no code yet — intentional, Domain Model milestone brings it

## Next Milestone

**Domain Model** — Mongoose schemas for User, Issue, Knowledge, Comment,
Project in `server/src/models/`. Mongoose connection singleton. Express app
bootstrap with Helmet, rate limiting, CORS. Zod validation schemas.
Correct from the start — no v1 bugs carried forward.

After Domain Model: Authentication.

## Reviewer Notes

Design System + Foundation milestone reviewed and rated 9.8/10.
Three post-review additions made:
1. `product-invariants.md` extracted from domain-model.md into its own file
2. `server/` directory established (same repo, sibling to `src/`)
3. CLAUDE.md and README updated to reflect complete milestone state

No open decisions remain. Ready to begin Domain Model milestone.
