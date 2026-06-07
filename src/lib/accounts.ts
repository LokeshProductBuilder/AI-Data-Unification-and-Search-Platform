import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { inngest } from "@/inngest/client";
import type { Provider } from "@prisma/client";
import type { OAuthTokens } from "@/types";

/**
 * Persist (or refresh) a connected mailbox with its tokens encrypted at rest,
 * then enqueue a sync job. Returns the account id.
 */
export async function saveConnectedAccount(
  userId: string,
  provider: Provider,
  tokens: OAuthTokens,
): Promise<string> {
  const account = await prisma.connectedAccount.upsert({
    where: {
      userId_provider_accountEmail: {
        userId,
        provider,
        accountEmail: tokens.accountEmail,
      },
    },
    create: {
      userId,
      provider,
      accountEmail: tokens.accountEmail,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      syncStatus: "SYNCING",
    },
    update: {
      accessToken: encrypt(tokens.accessToken),
      // Keep the existing refresh token if the provider didn't return a new one.
      ...(tokens.refreshToken
        ? { refreshToken: encrypt(tokens.refreshToken) }
        : {}),
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      syncStatus: "SYNCING",
      syncError: null,
    },
  });

  await inngest.send({
    name: "mailbox/sync.requested",
    data: { accountId: account.id, provider },
  });

  return account.id;
}
