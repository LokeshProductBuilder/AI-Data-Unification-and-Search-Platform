# Data Unification — Use Cases

Concrete scenarios the product is designed to serve, written as user stories with
their trigger, flow, and outcome. These map directly to the requirements in the
[PRD](../PRD.md).

---

## UC-1: Connect a mailbox and make it searchable

**Actor:** New user
**Trigger:** Just signed in, has no data yet.
**Flow:**
1. User clicks **Connect Gmail** (or Outlook).
2. Completes the provider OAuth consent screen.
3. Returns to the dashboard; the account shows **Syncing…**.
4. A background job fetches the last 500 messages, embeds, and stores them.
5. Status flips to **Synced · 500**.

**Outcome:** The user's recent email is searchable within a minute or two.
**Requirements:** F1, F2, F3.

---

## UC-2: Answer a fuzzy question across accounts

**Actor:** Returning user with Gmail + Outlook connected.
**Trigger:** Needs an answer but doesn't remember exact words or which account.
**Example:** *"What did Stripe say about the failed payment, and when's the retry?"*
**Flow:**
1. User types the question in the search bar (or presses `⌘K`).
2. The query is embedded; a top-20 pgvector similarity search runs across all
   accounts.
3. Claude streams a synthesized answer that cites the emails it used (`[1]`, `[3]`).
4. A ranked list of source emails appears with sender, subject, date, and match %.

**Outcome:** The user gets a direct, cited answer without opening any email.
**Requirements:** F4.

---

## UC-3: Verify an answer against its sources

**Actor:** User who just received an answer.
**Trigger:** Wants to confirm the answer is grounded in real email.
**Flow:**
1. User reads the cited numbers in the answer.
2. Clicks a source in the list (or an email row).
3. The detail drawer opens with the full message — sender, recipients, date, body.

**Outcome:** The user trusts the answer because they can see the receipts.
**Requirements:** F4, F5.

---

## UC-4: Browse and triage by provider

**Actor:** User reviewing recent mail.
**Trigger:** Wants to scan rather than search.
**Flow:**
1. User scrolls the dense, date-sorted inbox (infinite scroll).
2. Filters to **Gmail** or **Outlook** only.
3. Clicks any row to read the full message in the drawer.

**Outcome:** Fast scanning across unified mail with clear provider context.
**Requirements:** F5.

---

## UC-5: Re-sync to pick up new mail

**Actor:** Existing user returning after a few days.
**Trigger:** Wants the latest messages reflected.
**Flow:**
1. User clicks **Re-sync**.
2. Sync jobs are queued per account; statuses show **Syncing…**.
3. New messages are fetched, embedded, and added.

**Outcome:** Search and browse reflect current mail.
**Requirements:** F3.

---

## Edge cases & error states considered

- OAuth denied or cancelled → return to dashboard with a clear error, no partial account.
- Token expired mid-sync → transparently refreshed; sync continues.
- A message can't be fetched/parsed → skipped, sync continues (no hard failure).
- Search with no matching emails → the answer says so instead of hallucinating.
- Accessing an email id that isn't yours → 404 (per-user scoping, covered by tests).
