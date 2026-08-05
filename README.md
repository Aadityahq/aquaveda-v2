# AquaVeda v2

AquaVeda v2 is a reconstruction of the platform on Next.js App Router.
Water is the flagship domain.

## Current milestone

Foundation Slice:

- App shell with `layout.tsx`, metadata, fonts, navbar, footer
- Theme support with `next-themes` and a provider boundary
- Root route states (`loading.tsx`, `error.tsx`, `not-found.tsx`)
- Minimal design system primitives (`Button`, `Card`, `Badge`)
- One basic System status loop (`/api/system`) for server-to-client flow validation

## Tech stack (day 1)

- Next.js
- React
- TypeScript
- Tailwind CSS v4
- shadcn-style primitives dependencies
- `clsx` + `tailwind-merge`
- `next-themes`

Feature-specific libraries are intentionally deferred until their milestone starts.

## Getting started

```bash
npm install
npm run dev
```

## Planned documentation

The following documentation sets are planned and will be added when their milestone begins:

- Architecture docs
- ADR docs
- Engineering standards
- Testing strategy
- Domain model docs
