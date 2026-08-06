@AGENTS.md

# AquaVeda Progress

## Current Milestone

Design System + Application Foundation (complete)

## Completed

### Foundation Slice
- Root app shell: `layout.tsx` with metadata, fonts, Navbar, Footer
- ThemeProvider boundary (Client Component, isolated from Server layout)
- Route-level states: `loading.tsx`, `error.tsx`, `not-found.tsx`
- Design token system in `globals.css`: full named palette + semantic tokens, light and dark mode, `@theme inline` Tailwind v4 bridge, `contour-rule` utility, `prefers-reduced-motion` override
- One real Server → Client data loop: `getSystemSnapshot()` in `lib/system.ts` → `/api/system` Route Handler → `FoundationStatusCard` → `FoundationRefreshButton`

### UI Primitives
- `Button` — variant + size CVA, `asChild` via Radix Slot
- `Card` + `CardHeader` + `CardTitle` + `CardDescription` + `CardContent` + `CardFooter`
- `Badge` — domain-aware variants: `default`, `verified`, `warning`, `critical`, `outline`
- `Input` — text inputs with consistent focus ring, file reset, disabled state
- `Textarea` — vertical-resize only, consistent tokens
- `Separator` — horizontal/vertical, decorative
- `Skeleton` — Server Component loading placeholder
- `Avatar` + `AvatarImage` + `AvatarFallback` — ready for auth milestone

### Layout
- `Navbar` — Server Component, desktop nav, theme toggle slot
- `ThemeToggle` — Client Component with hydration guard (`mounted` state) and Sun/Moon icons from `lucide-react`
- `MobileNav` — Client Component, drawer, auto-close on route change, active link highlight, proper ARIA
- `Footer`

### Documentation
- `docs/vision/vision.md` + `docs/vision/principles.md`
- `docs/engineering/standards.md` + `docs/engineering/testing.md`
- `docs/adr/ADR-0001-new-repository.md`
- `docs/adr/ADR-0002-backend-architecture.md` (Accepted)
- `docs/domain/domain-model.md`
- `docs/architecture/nextjs-patterns.md`
- `docs/future/parking-lot.md`

## Architectural Decisions

- New repository over in-place migration (ADR-0001)
- Keep Express as a separate API service (ADR-0002, accepted)
- Server Components by default; Client Components at the smallest boundary
- Tailwind v4 CSS-first theming; semantic tokens only in components
- Dependency policy: add to `package.json` in the same commit as the first import

## Next Milestone

Domain Model implementation in the Express service, then Authentication.
