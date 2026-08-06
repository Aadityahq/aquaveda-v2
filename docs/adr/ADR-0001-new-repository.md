# ADR-0001: New repository — reconstruction over migration

## Status
Accepted

## Context

AquaVeda v1 (React + Vite + Express + MongoDB) proved the product concept
and most of the backend's domain logic. It also accumulated: hackathon-era
assumptions, a frontend where roughly half the nav is a static placeholder
despite a fully capable backend behind it, inconsistent validation across
modules, and a dead map implementation that was superseded mid-project.

The goal for v2 is Next.js App Router, TypeScript, a real design system,
and a frontend that matches the backend's actual capability. The question
was whether to do that in-place or in a new repository.

## Decision

New repository. This is a reconstruction, not a migration.

Business logic is preserved conceptually — geo issue model, moderation
lifecycle, RBAC, project contribution model. Everything else is redesigned
from first principles.

## Why

- An in-place migration inherits the old structure by default. Every file
  not explicitly touched stays exactly as it was — including the parts we
  explicitly want to redesign.
- The legacy repo mixes proven logic with abandoned experiments in the same
  tree. Separating them is cleaner as a frozen reference than as an ongoing
  refactor.
- A new repo gets a git history that tells v2's actual story from commit one.
- Nothing about the migration work requires the old repo to be the one
  being edited. A new repo costs nothing extra and removes the temptation
  to keep something "because it's already there."

## Alternatives considered

- **In-place migration** — rejected: existing structure gets preserved by
  inertia, which is exactly what we're trying to avoid.
- **Monorepo with legacy and v2 side by side** — rejected: unnecessary
  complexity for a solo project with no need to run both simultaneously.

## Consequences

- The legacy repository is kept as a specification (proven business logic),
  not a codebase that gets extended.
- Environment variables, CI, and deployment config all start fresh.
