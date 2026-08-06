# Principles

## Future-ready architecture. Present-focused product.

The schema has room for multiple domains. The product ships one.

## Nothing is grandfathered in.

The legacy repository is evidence of what works, not authority on how to build it.

## Feedback before conviction.

Architecture decided entirely on paper is educated guessing.

## Dependency policy: add it when you need it.

A package is added to `package.json` in the same commit as the first file that imports it.

## One artifact per kind of truth.

- Durable why reasoning goes in an ADR
- Per-milestone status goes in `CLAUDE.md`
- Standing rules go in `docs/engineering/standards.md`
- Deferred ideas go in `docs/future/parking-lot.md`