# Vision

## What AquaVeda is

AquaVeda is a civic intelligence platform. It lets communities, experts, and
organizations collaboratively identify, understand, prioritize, and resolve
environmental challenges through geospatial reporting, verified knowledge,
AI-assisted guidance, and coordinated action.

**Water is the flagship domain, not the ceiling.** The architecture does not
hard-code water as the only thing the product can ever represent — a `domain`
field in the Issue schema keeps that door open. But every product decision,
every feature, every design choice through v2's first real release is
water-scoped. Extensibility lives in the schema. Focus lives in the roadmap.

## Where it came from

AquaVeda began as a Smart India Hackathon (SIH 2024, Problem Statement 1690)
submission: a wiki-based platform for water-conservation knowledge sharing.
It grew into a fuller loop — geo-tagged issues, moderated knowledge,
community discussion, collaborative projects, AI guidance, and dashboards —
but its frontend never caught up with its backend. Most of what the backend
could do had no UI. V2 fixes that.

## What "reconstruction" means

Not a framework port. A rebuild from first principles. The proven business
logic (geo issue model, moderation lifecycle, RBAC, project contribution
model) is preserved as a reference. Everything else — architecture, folder
structure, UI, API layer, state management — is redesigned as if today were
day one.

The legacy repository (`AquaVeda2-main`, React + Vite + Express) is kept
as a specification of what works, not as a codebase to extend.

## Who this is for

- **Community members** — report a local water problem and know it went somewhere
- **Experts** — verify claims, approve knowledge, answer questions with domain authority
- **Organizers** — turn a cluster of reports into a coordinated project
- **Admins** — visibility across a region without reading every issue individually

Anonymous users can explore the map and read approved knowledge.
Contributing — reporting, commenting, writing, organizing — requires an account.
