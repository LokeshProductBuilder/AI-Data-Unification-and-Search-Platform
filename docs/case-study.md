# Case Study: Unify, natural-language search across your email

**Author:** Lokesh Mallagi
**Type:** Self-directed product and engineering project
**Timeframe:** 2026

**Links:** [Live demo](https://lokeshproductbuilder.github.io/AI-Data-Unification-and-Search-Platform/) · [Repository](https://github.com/LokeshProductBuilder/AI-Data-Unification-and-Search-Platform) · [PRD](../PRD.md) · [Use cases](use-cases.md)

> A quick note on the demo: it runs on sample data so you can click through it without
> signing in. The full stack (authentication, OAuth, embeddings, vector search, and
> streaming answers) is implemented in the repository.

## Overview

Unify started from a frustration I think a lot of people share but rarely name. Email is
where an enormous amount of our important information actually lives, and yet the tools
for getting information back out of it have barely changed in years. You still search by
guessing the exact keyword, one account at a time, and then you read through whatever
comes back. I wanted to find out whether a better model was possible: describe what you
are looking for in plain language, and get a direct answer that points you back to the
specific emails it came from.

I built Unify to test that idea from end to end. I scoped it, wrote the product
documentation, and then implemented the whole thing myself so that the product decisions
were grounded in what the technology could actually do rather than in guesswork.

## The problem

The core issue is that people remember things conceptually, not literally. You remember
"the invoice from the vendor we almost churned," not the sender's address or the exact
subject line. Traditional email search cannot help much with that, because it matches
words instead of meaning.

The problem compounds across multiple mailboxes, which is now the norm rather than the
exception. A single answer is often split between a Gmail thread and an Outlook reply.
Native search only looks inside one account at a time, it only does exact matches, and it
never synthesizes anything for you. So reconstructing "what happened" turns into opening
and reading a dozen separate messages. That gap is what Unify is built to close.

## My role

I was the only person on this project, acting as both the product manager and the
engineer. On the product side I defined the problem, the target users, and the scope, and
I wrote the [PRD](../PRD.md) and the [use cases](use-cases.md). On the engineering side I
implemented the full application and set up the tests and continuous integration. Doing
both was a deliberate choice. I wanted the product tradeoffs to be honest about cost,
latency, and effort, and the fastest way to keep myself honest was to actually build the
thing I was writing specs for.

## How I approached it

I started with writing, not code. Before building anything I wrote down who this was for
and what job it was doing for them. The primary user is someone I came to think of as the
overloaded operator: a founder, product manager, or freelancer who runs their work across
two or more inboxes, and whose most common need is simply "what did this person say about
that thing," without having to go hunting for it.

I spent as much time deciding what Unify would not do as I did on what it would. Cutting
scope early tends to be the highest-leverage decision a product person can make, so I
wrote deliberately sharp non-goals. No composing or sending email. No full mailbox history
in the first version. No team or shared inboxes, because this is a personal tool. Each of
those cuts made the first version something I could actually finish and reason about.

I also defined the success metrics up front, before writing code, because deciding how you
are going to judge something changes how you build it. The two that mattered most were
activation, meaning whether a new user connects an account and runs at least one search,
and answer trust, meaning whether a user who receives an answer actually clicks through to
one of the cited source emails. Everything else, like searches per week and time to the
first streamed token, sat underneath those two.

## Key product decisions and the tradeoffs

Every one of these was a genuine choice with a real cost on the other side. I think laying
them out honestly is more useful than pretending the design was obvious in hindsight.

| Decision | Why I made it | What I gave up |
| --- | --- | --- |
| Semantic (vector) search instead of keyword | People search by meaning, not by the exact words in the email | I had to stand up embedding and vector infrastructure (pgvector) |
| Cite the source emails in every answer | Trust is the deciding factor when an AI answers questions about personal data | Extra UI and prompt work to thread citations through a streaming response |
| Cap the first version at 500 messages per account | Keeps embedding and model cost predictable and keeps the initial sync fast | Users do not get their full mailbox history in v1 |
| Stream the answer token by token | Perceived speed matters, and a fast first token beats a slow but complete one | More complex streaming logic on both the client and the server |
| Encrypt tokens and offer one-click disconnect and delete | Connecting a personal inbox makes privacy non-negotiable | Additional encryption and data-lifecycle work |
| Ship a prototype demo instead of live OAuth for everyone | Google's restricted-scope verification takes weeks and is the wrong investment for a portfolio project | The public demo runs on sample data rather than a live inbox |

The last decision is the one I would flag most in an interview. Wiring up production OAuth
so that anyone can connect their real Gmail would have meant going through Google's
security assessment for restricted scopes, which is a multi-week process built for funded
companies, not portfolio projects. Rather than let that block the whole thing, I built a
faithful interactive prototype on sample data and kept the real integration code in the
repository. That let me demonstrate the product experience and the engineering without
spending weeks on verification paperwork that would not have taught me anything new.

## What I built

The result is a full-stack Next.js 14 application. It uses Clerk for authentication with
Google and Microsoft, and it connects mailboxes through the Gmail API and Microsoft Graph
with OAuth tokens that are encrypted at rest using AES-256-GCM. When an account connects, a
retriable background job (Inngest) fetches the recent messages, generates an embedding for
each one with OpenAI's text-embedding-3-small model, and stores everything in Postgres with
pgvector. Search then embeds the user's question, runs a top-20 cosine similarity lookup,
and streams back an answer from Anthropic's Claude with inline citations to the emails it
used. Around that sit a dense, provider-filtered inbox with a full-message detail view, and
account settings that let a user disconnect a mailbox and delete its stored data.

## Results and honest status

The application works from end to end, and there is a clickable demo that shows the full
experience. On the engineering side I held a real quality bar: 38 unit tests, including the
security-critical paths like token encryption and per-user data scoping, plus type
checking, linting, and a production build, all of which run in CI on every push.

I want to be straightforward about status, because I think that matters more than
overselling. This is a self-directed project, not a product with real users, so the metrics
I described earlier are the framework I would measure, not results I am claiming. The demo
is a prototype on sample data, and its search uses lightweight ranking rather than the live
vector-and-Claude pipeline that the real code implements. Framed that way, it is an honest
representation of the product thinking and the engineering, which is what I wanted it to be.

## What I would do next

If I kept going, my first move would be to instrument activation and answer trust as the
two headline signals, and then use the cited-source open rate to decide whether the
retrieval ranking needs work, since retrieval quality is what ultimately drives answer
quality. After that I would add incremental sync, so that a re-sync only fetches messages
newer than the last cursor instead of re-pulling everything, which directly reduces cost
and time. Further out, the more interesting direction is beyond email entirely. The longer
thesis behind Unify is that a person's scattered data, across email, calendar, files, and
messages, should be queryable as a single corpus, and email is just the first and messiest
surface to prove it on.

## What I took away

The most valuable product work here was not choosing a model or a framework. It was scoping
aggressively and designing for trust, specifically the citations and the easy delete.
Building the whole thing myself is what made those tradeoffs concrete. Feeling the real cost
of embeddings, for example, is exactly what justified capping the first version at 500
messages and putting incremental sync on the roadmap. That loop, where a product decision
and its engineering consequence sit right next to each other, is the part of this project I
found most useful, and it is how I like to work.
