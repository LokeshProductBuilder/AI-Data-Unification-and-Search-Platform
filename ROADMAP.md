# Roadmap

Unify is built and maintained incrementally. This is the running list of what's
done and what's next.

## Shipped

- [x] Project scaffold (Next.js 14, TypeScript, Tailwind)
- [x] Prisma schema with `User`, `ConnectedAccount`, `Email` + pgvector
- [x] Clerk auth (Google + Microsoft)
- [x] Gmail + Outlook OAuth connect flow with encrypted tokens
- [x] Inngest background sync (fetch → embed → store)
- [x] Dense, date-sorted email list with provider badges
- [x] Semantic search: pgvector top-20 + streaming Claude answers with citations
- [x] CI (lint, type-check, build) + Docker Compose for local Postgres
- [x] Keyboard shortcuts for search (`/`, `⌘K`, `Esc`)
- [x] Account settings: disconnect a mailbox and delete its emails (user-scoped, cascading)
- [x] Email detail view (slide-over drawer with full message)
- [x] Incremental sync: after the first backfill, only fetch mail newer than `lastSyncedAt`
- [x] Unit tests (Vitest, 44 tests): `crypto`, `format`, embeddings, `env`, semantic search wiring, token refresh, incremental-sync query building, and the email APIs (detail + disconnect, incl. user scoping)

## Next up

- [ ] Loading skeletons + polished empty states
- [ ] Search history and saved searches
- [ ] Highlight cited emails (`[n]`) inline in the answer
- [ ] Rate limiting on the search endpoint

## Later

- [ ] More connectors (Slack, Notion, Google Drive)
- [ ] Per-thread summaries
- [ ] Deploy a public demo (Vercel + hosted Postgres)
