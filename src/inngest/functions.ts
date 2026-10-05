import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/tokens";
import { gmailFetchRecent } from "@/lib/gmail";
import { outlookFetchRecent } from "@/lib/outlook";
import { storeEmails } from "@/lib/email-store";

const MAX_EMAILS = 500;

// Re-fetch a small window before the last cursor to absorb clock skew. Upserts
// are keyed on (accountId, externalId), so any overlap is deduplicated.
const SYNC_OVERLAP_MS = 60_000;

/**
 * Sync a single mailbox, then embed and store the messages with their vectors.
 * Triggered when an account is connected or a re-sync is requested.
 *
 * The first sync for an account is a full backfill (up to 500 messages).
 * Afterwards we only fetch mail newer than `lastSyncedAt`, which keeps re-syncs
 * cheap in both API calls and embedding cost.
 *
 * Note: each step's return value is JSON-serialised by Inngest, so we reload
 * the account (with real Date objects) inside the fetch step rather than
 * passing it across a step boundary.
 */
export const syncMailbox = inngest.createFunction(
  {
    id: "sync-mailbox",
    name: "Sync mailbox",
    concurrency: { limit: 5 },
    retries: 2,
  },
  { event: "mailbox/sync.requested" },
  async ({ event, step }) => {
    const { accountId } = event.data;

    await step.run("mark-syncing", async () => {
      await prisma.connectedAccount.update({
        where: { id: accountId },
        data: { syncStatus: "SYNCING", syncError: null },
      });
    });

    try {
      const result = await step.run("fetch-embed-store", async () => {
        // Capture the cursor before fetching so mail that arrives mid-sync is
        // still picked up on the next run.
        const cursor = new Date().toISOString();

        const account = await prisma.connectedAccount.findUnique({
          where: { id: accountId },
        });
        if (!account) throw new Error(`Account ${accountId} not found`);

        const since = account.lastSyncedAt
          ? new Date(account.lastSyncedAt.getTime() - SYNC_OVERLAP_MS)
          : null;

        const { accessToken, refreshToken } =
          await getValidAccessToken(account);

        const emails =
          account.provider === "GMAIL"
            ? await gmailFetchRecent(accessToken, refreshToken, MAX_EMAILS, since)
            : await outlookFetchRecent(accessToken, MAX_EMAILS, since);

        const stored = await storeEmails(
          account.userId,
          account.id,
          account.provider,
          emails,
        );

        return { stored, cursor, incremental: since !== null };
      });

      await step.run("mark-complete", async () => {
        await prisma.connectedAccount.update({
          where: { id: accountId },
          data: {
            syncStatus: "COMPLETED",
            lastSyncedAt: new Date(result.cursor),
          },
        });
      });

      return {
        accountId,
        emailsStored: result.stored,
        incremental: result.incremental,
      };
    } catch (err) {
      await step.run("mark-failed", async () => {
        await prisma.connectedAccount.update({
          where: { id: accountId },
          data: {
            syncStatus: "FAILED",
            syncError: err instanceof Error ? err.message : String(err),
          },
        });
      });
      throw err;
    }
  },
);

export const functions = [syncMailbox];
