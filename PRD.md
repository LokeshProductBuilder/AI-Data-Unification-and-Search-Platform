# Data Unification — Product Requirements Document

**Status:** Living document · **Owner:** Lokesh Mallagi · **Last updated:** July 2026

---

## 1. Overview

**Data Unification** is a personal data platform that connects a user's email accounts
(Gmail and Outlook) and lets them find answers across everything they've received
using natural language, instead of keyword search and manual scrolling.

The first surface is email, because it's the highest-volume, lowest-structure
personal data store most people own. The longer-term thesis is that a person's
scattered data (email, calendar, files, messages) should be queryable as one
corpus with an LLM on top.

## 2. Problem

Email search is still keyword-based and literal. Users know *what* they're looking
for conceptually ("the invoice from the vendor we almost churned") but not the
exact words to match. Across two or three mailboxes, the problem compounds:

- Answers are spread across multiple messages and threads.
- Native search is per-account, exact-match, and doesn't synthesize.
- Reconstructing "what happened" means opening and reading many emails.

## 3. Goals & non-goals

### Goals
- Let a user ask a question in plain language and get a synthesized answer.
- Ground every answer in the user's real emails, with citations.
- Unify multiple providers (Gmail + Outlook) into one searchable view.
- Feel fast and dense, like a professional tool (Linear / Raycast).

### Non-goals (for v1)
- Sending, replying to, or composing email.
- Full mailbox history (v1 scopes to the most recent 500 messages per account).
- Team / shared inboxes — this is a single-user, personal tool.
- Mobile-native apps (responsive web only).

## 4. Target users

| Persona | Description | Primary need |
| --- | --- | --- |
| **The overloaded operator** | Founder / PM / freelancer running work across 2+ inboxes. | "What did X say about Y?" without hunting. |
| **The context switcher** | Knowledge worker who forgets which account something arrived in. | One search box across all mail. |
| **The researcher of their own life** | Anyone reconstructing a decision, a bill, a commitment. | Synthesized answers with sources. |

## 5. Jobs to be done

- *When* I vaguely remember an email but not the sender or words, *I want to*
  describe it and find it, *so I can* stop scrolling.
- *When* a topic spans several messages, *I want* one synthesized answer, *so I*
  don't have to read them all.
- *When* I get an answer, *I want* to see which emails it came from, *so I can*
  trust and verify it.

## 6. Requirements

### 6.1 Functional (v1 — shipped)
- **F1. Authentication.** Sign in with Google or Microsoft (Clerk).
- **F2. Connect accounts.** OAuth connect for Gmail and Outlook; tokens stored
  encrypted; support multiple accounts.
- **F3. Ingest & embed.** On connect, fetch the last 500 messages, normalize
  them, embed each (OpenAI `text-embedding-3-small`), and store with vectors.
- **F4. Semantic search.** Embed the query, run a top-20 pgvector similarity
  search, and stream an LLM answer (Claude) that cites the emails used.
- **F5. Browse.** Dense, date-sorted list across providers with provider badges,
  filters, infinite scroll, and a detail view for the full message.

### 6.2 Non-functional
- **Security:** OAuth tokens encrypted at rest (AES-256-GCM); per-user data
  isolation enforced on every read; least-privilege scopes (`gmail.readonly`,
  `Mail.Read`).
- **Performance:** Search returns first token quickly by streaming; list is
  paginated (50/page).
- **Reliability:** Sync runs as a retriable background job (Inngest), with
  per-account status and error surfacing.
- **Quality:** Type-checked, linted, unit-tested, and built in CI on every push.

## 7. Success metrics

| Metric | Target signal |
| --- | --- |
| **Activation** | % of new users who connect ≥1 account and run ≥1 search. |
| **Answer trust** | % of answers where the user opens a cited source. |
| **Search adoption** | Searches per active user per week. |
| **Time-to-answer** | Median seconds from question to first streamed token. |
| **Retention** | W1 / W4 return rate of users who completed a search. |

## 8. Scope & phasing

- **Phase 1 (done):** Auth, connect, sync 500, semantic search with citations,
  browse + detail.
- **Phase 2 (next):** Loading/empty-state polish, account settings (disconnect &
  delete), inline citation highlighting, incremental sync.
- **Phase 3 (later):** More connectors (Slack, Notion, Drive), per-thread
  summaries, saved searches, a public hosted demo.

## 9. Risks & open questions

- **Privacy & trust:** users are connecting personal email — encryption,
  transparency, and easy disconnect/delete are table stakes.
- **Cost:** embeddings + LLM calls scale with mailbox size; need batching and
  caps (v1 caps at 500 messages).
- **Answer quality:** retrieval quality drives answer quality — how do we measure
  and improve ranking over time?
- **Provider limits:** Gmail/Graph rate limits on large syncs.
