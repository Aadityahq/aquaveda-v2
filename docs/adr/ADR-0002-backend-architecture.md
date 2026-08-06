# ADR-0002: Keep Express as a separate API service

## Status
Accepted

## Context

Two options were evaluated for the v2 backend: retire Express and move everything into Next.js Route Handlers and Server Actions, or keep Express as a separate API service.

## Decision

Keep Express as a separate API service. Next.js remains the frontend/BFF.

## Why

- The backend is already proven at the domain level.
- Reversing an explicit stack decision needs a concrete problem to solve.
- The frontend should talk to the backend over HTTP.

## Consequences

- Business logic stays in the Express service.
- Next.js Route Handlers are not the place to migrate business logic.
- Server Actions are not used to absorb backend domain behavior.