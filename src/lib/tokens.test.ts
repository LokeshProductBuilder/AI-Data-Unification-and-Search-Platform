import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConnectedAccount } from "@prisma/client";

// Simple reversible stand-ins so we can assert on encrypt/decrypt behaviour.
vi.mock("@/lib/crypto", () => ({
  encrypt: (s: string) => `enc:${s}`,
  decrypt: (s: string) => s.replace(/^enc:/, ""),
}));

const update = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    connectedAccount: { update: (...args: unknown[]) => update(...args) },
  },
}));

const gmailRefresh = vi.fn();
const outlookRefresh = vi.fn();
vi.mock("@/lib/gmail", () => ({
  gmailRefresh: (...args: unknown[]) => gmailRefresh(...args),
}));
vi.mock("@/lib/outlook", () => ({
  outlookRefresh: (...args: unknown[]) => outlookRefresh(...args),
}));

import { getValidAccessToken } from "@/lib/tokens";

function makeAccount(overrides: Partial<ConnectedAccount>): ConnectedAccount {
  return {
    id: "acc_1",
    userId: "user_123",
    provider: "GMAIL",
    email: "me@example.com",
    accessToken: "enc:AT",
    refreshToken: "enc:RT",
    expiresAt: new Date(Date.now() + 3_600_000),
    ...overrides,
  } as unknown as ConnectedAccount;
}

beforeEach(() => {
  update.mockReset();
  gmailRefresh.mockReset();
  outlookRefresh.mockReset();
});

describe("getValidAccessToken", () => {
  it("returns the decrypted token without refreshing when still valid", async () => {
    const account = makeAccount({
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    const result = await getValidAccessToken(account);

    expect(result.accessToken).toBe("AT");
    expect(result.refreshToken).toBe("RT");
    expect(gmailRefresh).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("refreshes an expired Gmail token and persists the new value", async () => {
    const account = makeAccount({
      provider: "GMAIL",
      expiresAt: new Date(Date.now() - 1_000),
    });
    gmailRefresh.mockResolvedValue({
      accessToken: "NEW_AT",
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    const result = await getValidAccessToken(account);

    expect(gmailRefresh).toHaveBeenCalledWith("RT");
    expect(result.accessToken).toBe("NEW_AT");
    // The stored access token must be encrypted, never plaintext.
    const stored = update.mock.calls[0][0] as {
      data: { accessToken: string };
    };
    expect(stored.data.accessToken).toBe("enc:NEW_AT");
  });

  it("refreshes an expired Outlook token, including a rotated refresh token", async () => {
    const account = makeAccount({
      provider: "OUTLOOK",
      expiresAt: new Date(Date.now() - 1_000),
    });
    outlookRefresh.mockResolvedValue({
      accessToken: "NEW_AT_O",
      refreshToken: "NEW_RT_O",
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    const result = await getValidAccessToken(account);

    expect(outlookRefresh).toHaveBeenCalledWith("RT");
    expect(result.accessToken).toBe("NEW_AT_O");
    expect(result.refreshToken).toBe("NEW_RT_O");
  });

  it("does not attempt a refresh when there is no refresh token", async () => {
    const account = makeAccount({
      refreshToken: null,
      expiresAt: new Date(Date.now() - 1_000),
    });

    const result = await getValidAccessToken(account);

    expect(result.accessToken).toBe("AT");
    expect(result.refreshToken).toBeNull();
    expect(gmailRefresh).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
