# Case Study — Unify: natural-language search across your email

**Author:** Lokesh Mallagi · **Type:** Self-directed product + build project · **Timeframe:** 2026

**Links:** [Live demo](https://lokeshproductbuilder.github.io/AI-Data-Unification-and-Search-Platform/) · [Repository](https://github.com/LokeshProductBuilder/AI-Data-Unification-and-Search-Platform) · [PRD](../PRD.md) · [Use cases](use-cases.md)

> The demo is an interactive prototype on sample data (no login). The full stack —
> auth, OAuth, embeddings, vector search, and streaming answers — is implemented in
> the repository.

---

## TL;DR

Email is the highest-volume, lowest-structure data most people own, yet search over
it is still literal keyword matching, per-account, and un-synthesized. I designed and
built **Unify**: connect Gmail + Outlook, and ask questions in plain language to get a
single **cited** answer instead of scrolling. I owned it end to end — wrote the PRD and
use cases first, then implemented the full stack (Next.js, Postgres/pgvector, OpenAI
embeddings, Anthropic Claude) and shipped it with tests and CI.

## The problem

People know *what* they're looking for conceptually — "the invoice from the vendor we
almost churned" — but not the exact words to match. Across two or three mailboxes it
compounds:

- Answers are spread across multiple messages and threads.
- Native search is per-account, exact-match, and doesn't synthesize.
- Reconstructing "what happened" means opening and reading many emails.

## My role

Sole PM and builder. I treated it like a real product: defined the problem, users, and
scope; wrote the [PRD](../PRD.md) and [use cases](use-cases.md); made the build vs.
scope tradeoffs; then implemented and tested it.

## Approach: docs first, then build

I started with product artifacts so the build had a spine:

- **Users & JTBD** — an "overloaded operator" running work across 2+ inboxes whose core
  job is *"what did X say about Y?"* without hunting.
- **Sharp non-goals** — no composing/sending, no full history (cap at 500 recent
  messages), single-user only. Narrowing scope was the most important early decision.
- **Success metrics defined up front** — activation (connect + first search),
  answer-trust (did the user open a cited source?), time-to-first-token, and retention.

## Key product decisions & tradeoffs

| Decision | Why | Tradeoff accepted |
| --- | --- | --- |
| **Semantic (vector) search over keyword** | Users search by *meaning*, not exact terms | Added embedding + vector infra (pgvector) |
| **Always cite the source emails** | Trust is the make-or-break for an AI answer over personal data | More UI + prompt work to thread citations through |
| **Cap v1 at 500 messages/account** | Controls embedding/LLM cost and sync time | Not full mailbox history in v1 |
| **Stream the answer (NDJSON)** | Perceived speed — first token fast beats a slow complete answer | More complex client/stream handling |
| **Encrypt tokens + one-click disconnect/delete** | Connecting personal email makes privacy table stakes | Extra crypto + data-lifecycle work |
| **Ship a prototype demo, not live OAuth** | Google restricted-scope verification is weeks of process; wrong ROI for a portfolio | Demo runs on sample data, not a live inbox |

## What I built

A full-stack Next.js 14 app: Clerk auth (Google/Microsoft), OAuth connect for Gmail and
Microsoft Graph with **AES-256-GCM-encrypted tokens**, a retriable **Inngest** background
job that fetches → embeds (**OpenAI `text-embedding-3-small`**) → stores in
**Postgres + pgvector**, and a search flow that embeds the query, runs a top-20 cosine
similarity search, and **streams a Claude answer with inline citations**. Plus a dense,
provider-filtered inbox with a detail view, and account settings to disconnect a mailbox
and delete its data.

## Results & status

- **Working end-to-end implementation** with a clickable interactive demo.
- **Quality bar:** 38 unit tests (incl. security-critical paths like token encryption and
  per-user data scoping), type-checking, linting, and a production build — all enforced in
  **CI on every push**.
- **Honest status:** a self-directed project, not a product with real users — so the
  metrics above are the framework I'd measure, not claimed outcomes.

## What I'd do next / measure

- Instrument **activation** and **answer-trust** (cited-source open rate) as the two North
  Star signals; use them to decide whether retrieval ranking needs work.
- **Incremental sync** (only fetch messages newer than the last cursor) to cut cost/time.
- Expand connectors (Slack, Notion, Drive) — the longer-term thesis is one queryable
  personal corpus, not just email.

## What I learned

The hardest and highest-leverage PM work was **scoping** (aggressive non-goals) and
**designing for trust** (citations + easy delete), not the model choice. Building it
myself made those tradeoffs concrete — e.g., feeling the cost of embeddings is what
justified the 500-message cap and an incremental-sync roadmap item.
