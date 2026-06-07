import type { Provider } from "@prisma/client";

export type { Provider };

/** Normalised email shape returned to the client (no embedding, no tokens). */
export interface EmailListItem {
  id: string;
  provider: Provider;
  fromName: string | null;
  fromEmail: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: string; // ISO string
  isRead: boolean;
}

/** A normalised message as returned by a provider adapter before persistence. */
export interface NormalizedEmail {
  externalId: string;
  threadId: string | null;
  fromName: string | null;
  fromEmail: string | null;
  toEmails: string[];
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  receivedAt: Date;
  isRead: boolean;
  labels: string[];
}

/** OAuth token bundle returned by a provider's token exchange. */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
  accountEmail: string;
}

/** A single email cited by the search answer stream. */
export interface SearchCitation {
  id: string;
  provider: Provider;
  fromName: string | null;
  fromEmail: string | null;
  subject: string | null;
  receivedAt: string;
  similarity: number;
}
