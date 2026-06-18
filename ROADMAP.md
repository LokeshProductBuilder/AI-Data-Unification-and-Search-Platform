# Roadmap

Unified is built and maintained incrementally. This is the running list of what's
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
- [x] Unit tests (Vitest) for `crypto`, `format`, and vector serialization

## Next up

- [ ] Email detail / thread view
- [ ] Loading skeletons + polished empty states
- [ ] Account settings: disconnect a mailbox, delete its emails
- [ ] Search history and saved searches
- [ ] Incremental sync (only fetch messages newer than the last sync)
- [ ] Highlight cited emails (`[n]`) inline in the answer
- [ ] Rate limiting on the search endpoint

## Later

- [ ] More connectors (Slack, Notion, Google Drive)
- [ ] Per-thread summaries
- [ ] Deploy a public demo (Vercel + hosted Postgres)
