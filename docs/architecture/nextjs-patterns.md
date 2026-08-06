# Next.js Architecture Patterns

## Server/Client boundary

Default to Server Component. Add `use client` only where code actually needs browser APIs, React state, or event handlers.

## Data fetching

- Server Components call shared lib functions directly.
- Client Components use plain fetch only for one-shot refetches.
- Mutations live in Server Actions or Route Handlers depending on the consumer.

## Folder conventions

- `src/app/` for routes only
- `src/components/ui/` for stateless primitives
- `src/components/layout/` for app shell pieces
- `src/components/providers/` for client context providers
- `src/lib/` for framework-agnostic utilities