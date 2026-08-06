# AquaVeda v2

A civic intelligence platform: communities, experts, and organizations
collaboratively identify, understand, prioritize, and resolve environmental
challenges through geospatial reporting, verified knowledge, AI-assisted
guidance, and coordinated action.

**Water is the flagship domain, not the ceiling.**

This is a reconstruction — not a migration — of the original AquaVeda
(React + Vite + Express, SIH 2024). See `docs/adr/ADR-0001-new-repository.md`.

---

## Current milestone

**Design System + Application Foundation — complete.**

App shell, design tokens, full UI primitive library, mobile navigation,
hydration-safe theme toggle, and one validated Server → Client data loop.
No business logic yet. Full checklist in `CLAUDE.md`.

## Next milestone

**Domain Model** — Mongoose schemas, Express bootstrap, Zod validation.

---

## Repository layout

```
aquaveda-v2/
  src/          Next.js web application (App Router)
  server/       Express API service
  docs/         Architecture, ADRs, engineering standards, vision
```

Frontend and backend share one repository — one roadmap, one documentation
set, one release cadence. Future evolution path: `apps/web` + `apps/server`
workspace layout if a third surface (mobile, etc.) ever justifies it.

---

## Getting started

```bash
# Web app
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint

# Server (nothing to run yet — Domain Model milestone brings first code)
cd server
npm install
```

---

## Tech stack (installed today)

**Web (`src/`):**
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Radix UI (`react-slot`, `react-avatar`, `react-dialog`) ·
`class-variance-authority` · `clsx` · `tailwind-merge` ·
`lucide-react` · `next-themes`

**Server (`server/`):**
Nothing installed yet — Express, Mongoose, Zod, and `jsonwebtoken`
arrive at the Domain Model and Authentication milestones.

Feature-specific libraries are added at the milestone that first imports
them. `package.json` reflects what is actually built today.

---

## Documentation

```
docs/
  vision/        vision.md, principles.md, product-invariants.md
  engineering/   standards.md (coding rules, dependency policy, DoD)
                 testing.md
  adr/           ADR-0001 (new repo), ADR-0002 (keep Express)
  domain/        domain-model.md (primitives and their milestones)
  architecture/  nextjs-patterns.md
  future/        parking-lot.md
```

Start with `docs/vision/vision.md`.
Read `docs/vision/product-invariants.md` to understand the non-negotiable rules.
Read `docs/adr/` to understand why things are built the way they are.
