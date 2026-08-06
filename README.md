# AquaVeda v2

A civic intelligence platform: communities, experts, and organizations collaboratively identify, understand, prioritize, and resolve environmental challenges through geospatial reporting, verified knowledge, AI-assisted guidance, and coordinated action.

Water is the flagship domain, not the ceiling.

This is a reconstruction, not a migration, of the original AquaVeda (React + Vite + Express, SIH 2024).

---

## Current milestone

Design System + Application Foundation is complete.

The app shell, design tokens, UI primitive library, mobile navigation, and one validated Server → Client data loop are in place. No business logic has been added yet. See `CLAUDE.md` for the completed checklist.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
```

Feature-specific libraries are added at the milestone that needs them. `package.json` reflects what is actually built today.

## Tech stack (installed today)

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- `next-themes`
- `clsx`, `tailwind-merge`, `class-variance-authority`
- `lucide-react`

Planned libraries such as `zod`, React Hook Form, TanStack Query, Leaflet, Framer Motion, `jose`, and `bcryptjs` are intentionally deferred until their milestone starts.

## Documentation

```
docs/
	vision/        vision.md, principles.md
	engineering/   standards.md, testing.md
	adr/           ADR-0001 (new repo), ADR-0002 (keep Express)
	domain/        domain-model.md
	architecture/  nextjs-patterns.md
	future/        parking-lot.md
```

Start with `docs/vision/vision.md` to understand what is being built.

## Project structure

```
src/
	app/              Routes: layout, page, loading, error, not-found, api/**
	components/
		ui/             Button, Card, Badge, Input, Textarea, Separator,
										Skeleton, Avatar
		layout/         Navbar, Footer, ThemeToggle, MobileNav
		providers/      ThemeProvider
		foundation/     Foundation Slice status card + refresh button
	lib/
		utils.ts        cn() — Tailwind class merge utility
		system.ts       getSystemSnapshot() — server-side system data
```
