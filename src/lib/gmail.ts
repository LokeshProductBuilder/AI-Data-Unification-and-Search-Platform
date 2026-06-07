import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { serverEnv, redirectUri } from "@/lib/env";
import type { NormalizedEmail, OAuthTokens } from "@/types";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "openid",
  "email",
];

export function gmailOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    serverEnv.googleClientId(),
    serverEnv.googleClientSecret(),
    redirectUri.gmail(),
  );
}

/** Build the Google consent URL. `state` is an opaque CSRF token. */
export function gmailAuthUrl(state: string): string {
  return gmailOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh token every time
    scope: GMAIL_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

/** Exchange an authorization code for tokens + the mailbox address. */
export async function gmailExchangeCode(code: string): Promise<OAuthTokens> {
  const client = gmailOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: client });
  const profile = await gmail.users.getProfile({ userId: "me" });

  return {
    accessToken: tokens.access_token ?? "",
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope ?? GMAIL_SCOPES.join(" "),
    accountEmail: profile.data.emailAddress ?? "unknown",
  };
}

/** An authenticated Gmail client for a stored account. */
function gmailClientFor(accessToken: string, refreshToken: string | null) {
  const client = gmailOAuthClient();
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
  });
  return google.gmail({ version: "v1", auth: client });
}

/** Refresh an access token; returns the new token + expiry. */
export async function gmailRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date | null }> {
  const client = gmailOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return {
    accessToken: credentials.access_token ?? "",
    expiresAt: credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : null,
  };
}

function header(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string | undefined {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())
    ?.value ?? undefined;
}

/** Parse "Display Name <addr@x.com>" into its parts. */
function parseAddress(raw?: string): { name: string | null; email: string | null } {
  if (!raw) return { name: null, email: null };
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim() || null, email: match[2].trim() };
  }
  return { name: null, email: raw.trim() };
}

function decodeBody(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return "";
  if (part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf8");
  }
  if (part.parts) {
    // Prefer text/plain, fall back to the first text part.
    const plain = part.parts.find((p) => p.mimeType === "text/plain");
    return decodeBody(plain ?? part.parts[0]);
  }
  return "";
}

function stripHtml(text: string): string {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch up to `max` of the most recent messages, fully normalised.
 * Uses list + batched get; Gmail has no bulk get, so we parallelise in chunks.
 */
export async function gmailFetchRecent(
  accessToken: string,
  refreshToken: string | null,
  max = 500,
): Promise<NormalizedEmail[]> {
  const gmail = gmailClientFor(accessToken, refreshToken);

  // 1. Collect message ids (paginated, newest first).
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < max) {
    const res = await gmail.users.messages.list({
      userId: "me",
      maxResults: Math.min(100, max - ids.length),
      pageToken,
      q: "in:inbox OR in:sent",
    });
    for (const m of res.data.messages ?? []) {
      if (m.id) ids.push(m.id);
    }
    pageToken = res.data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  // 2. Fetch each message in bounded-concurrency chunks.
  const out: NormalizedEmail[] = [];
  const CHUNK = 20;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const msgs = await Promise.all(
      chunk.map((id) =>
        gmail.users.messages
          .get({ userId: "me", id, format: "full" })
          .then((r) => r.data)
          .catch(() => null),
      ),
    );
    for (const msg of msgs) {
      if (!msg?.id) continue;
      const headers = msg.payload?.headers;
      const from = parseAddress(header(headers, "From"));
      const to = (header(headers, "To") ?? "")
        .split(",")
        .map((s) => parseAddress(s).email)
        .filter((e): e is string => Boolean(e));
      const dateMs = msg.internalDate ? Number(msg.internalDate) : Date.now();
      const rawBody = decodeBody(msg.payload);
      const bodyText = stripHtml(rawBody).slice(0, 20000);

      out.push({
        externalId: msg.id,
        threadId: msg.threadId ?? null,
        fromName: from.name,
        fromEmail: from.email,
        toEmails: to,
        subject: header(headers, "Subject") ?? null,
        snippet: msg.snippet ?? null,
        bodyText: bodyText || null,
        receivedAt: new Date(dateMs),
        isRead: !(msg.labelIds ?? []).includes("UNREAD"),
        labels: msg.labelIds ?? [],
      });
    }
  }

  return out;
}
