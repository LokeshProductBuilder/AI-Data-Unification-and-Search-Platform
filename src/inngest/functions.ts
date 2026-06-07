import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/tokens";
import { gmailFetchRecent } from "@/lib/gmail";
import { outlookFetchRecent } from "@/lib/outlook";
import { storeEmails } from "@/lib/email-store";

const MAX_EMAILS = 500;

/**
 * Sync a single mailbox: fetch the last 500 messages, embed them, and store
 * them with their vectors. Triggered when an account is connected.
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
      const count = await step.run("fetch-embed-store", async () => {
        const account = await prisma.connectedAccount.findUnique({
          where: { id: accountId },
        });
        if (!account) throw new Error(`Account ${accountId} not found`);

        const { accessToken, refreshToken } =
          await getValidAccessToken(account);

        const emails =
          account.provider === "GMAIL"
            ? await gmailFetchRecent(accessToken, refreshToken, MAX_EMAILS)
            : await outlookFetchRecent(accessToken, MAX_EMAILS);

        return storeEmails(
          account.userId,
          account.id,
          account.provider,
          emails,
        );
      });

      await step.run("mark-complete", async () => {
        await prisma.connectedAccount.update({
          where: { id: accountId },
          data: { syncStatus: "COMPLETED", lastSyncedAt: new Date() },
        });
      });

      return { accountId, emailsStored: count };
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
