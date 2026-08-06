# ADR-0001: New repository - reconstruction over migration

## Status
Accepted

## Context

AquaVeda v1 proved the product concept and most of the backend's domain logic. It also accumulated hackathon-era assumptions, inconsistent validation, and a frontend that lagged the backend.

## Decision

New repository. This is a reconstruction, not a migration.

## Why

- An in-place migration inherits old structure by default.
- The legacy repo mixes proven logic with abandoned experiments.
- A new repo gives v2 its own git history.

## Consequences

- The legacy repository is kept as a specification, not a codebase to extend.
- Environment variables, CI, and deployment config all start fresh.