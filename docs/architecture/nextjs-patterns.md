# Next.js Architecture Patterns

## Server/Client boundary

Default: Server Component. Add `"use client"` only where code actually
needs browser APIs, React state, or event handlers. Then push that boundary
as deep in the tree as possible, not at the page level.

**Reference pattern — the Foundation Slice status card:**
- `page.tsx` (Server Component): calls `getSystemSnapshot()` directly —
  no fetch, no useEffect, no loading state. Runs on the server.
- `FoundationStatusCard` (Client Component): owns the interactive refresh,
  seeded with the server-rendered initial snapshot.
- `FoundationRefreshButton` (Client Component): the single interactive
  element, isolated so the card shell doesn't need to be client.

Every later data-heavy screen follows the same split.

## Data fetching

- **Server Components:** call shared lib functions directly. Never fetch
  the app's own API route over HTTP — that's an unnecessary network hop
  for data already available in process.
- **Client Components:** plain `fetch` + `useTransition` for one-shot
  refetches with no caching need (the refresh button). TanStack Query
  once a screen needs real client-side cache/refetch/optimistic updates
  — not before.
- **Mutations:** Server Actions for form-driven mutations. Route Handlers
  for REST-shaped consumers (the typed API client talking to Express,
  the refresh button, any future external consumer).

## Folder conventions

```
src/
  app/              routes only — layout, page, loading, error, not-found,
                    and api/** route handlers
  components/
    ui/             stateless shadcn-style primitives, no domain knowledge
    layout/         app shell: navbar, footer, theme toggle, mobile nav
    providers/      "use client" context providers
    foundation/     Foundation Slice components (replaced by feature
                    modules as they ship: explore/, wiki/, etc.)
  lib/              framework-agnostic utilities called by Server Components
```

## API client (Authentication milestone)

A typed fetch wrapper lives in `lib/api-client.ts`. Every request to the
Express backend goes through it — never a raw `fetch` with a string URL
scattered across components. It handles:
- Base URL from environment variable
- Authorization header injection
- Response envelope unwrapping (`{ success, data, message }`)
- Error normalization using the `code` field on error responses
