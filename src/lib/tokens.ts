import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { gmailRefresh } from "@/lib/gmail";
import { outlookRefresh } from "@/lib/outlook";
import type { ConnectedAccount } from "@prisma/client";

/**
 * Return a currently-valid access token for an account, transparently
 * refreshing (and re-persisting) it if it is expired or close to expiring.
 */
export async function getValidAccessToken(
  account: ConnectedAccount,
): Promise<{ accessToken: string; refreshToken: string | null }> {
  const refreshToken = account.refreshToken
    ? decrypt(account.refreshToken)
    : null;

  const skewMs = 60_000; // refresh if it expires within a minute
  const stillValid =
    account.expiresAt && account.expiresAt.getTime() - skewMs > Date.now();

  if (stillValid) {
    return { accessToken: decrypt(account.accessToken), refreshToken };
  }

  if (!refreshToken) {
    // No way to refresh — fall back to whatever we have and let the API fail.
    return { accessToken: decrypt(account.accessToken), refreshToken };
  }

  if (account.provider === "GMAIL") {
    const refreshed = await gmailRefresh(refreshToken);
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encrypt(refreshed.accessToken),
        expiresAt: refreshed.expiresAt,
      },
    });
    return { accessToken: refreshed.accessToken, refreshToken };
  }

  const refreshed = await outlookRefresh(refreshToken);
  await prisma.connectedAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encrypt(refreshed.accessToken),
      refreshToken: refreshed.refreshToken
        ? encrypt(refreshed.refreshToken)
        : account.refreshToken,
      expiresAt: refreshed.expiresAt,
    },
  });
  return {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? refreshToken,
  };
}
