import { serverEnv, redirectUri } from "@/lib/env";
import type { NormalizedEmail, OAuthTokens } from "@/types";

/**
 * Microsoft Graph adapter. We talk to the OAuth2 v2.0 endpoints and the Graph
 * REST API directly via fetch to keep dependencies light.
 */

const GRAPH_SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "https://graph.microsoft.com/Mail.Read",
];

function authority(): string {
  return `https://login.microsoftonline.com/${serverEnv.microsoftTenantId()}`;
}

export function outlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: serverEnv.microsoftClientId(),
    response_type: "code",
    redirect_uri: redirectUri.outlook(),
    response_mode: "query",
    scope: GRAPH_SCOPES.join(" "),
    state,
  });
  return `${authority()}/oauth2/v2.0/authorize?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

async function requestToken(
  body: Record<string, string>,
): Promise<TokenResponse> {
  const res = await fetch(`${authority()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: serverEnv.microsoftClientId(),
      client_secret: serverEnv.microsoftClientSecret(),
      ...body,
    }),
  });
  if (!res.ok) {
    throw new Error(`Microsoft token request failed: ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

async function graphGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Graph request ${path} failed: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function outlookExchangeCode(code: string): Promise<OAuthTokens> {
  const token = await requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri.outlook(),
    scope: GRAPH_SCOPES.join(" "),
  });

  const me = await graphGet<{ mail?: string; userPrincipalName?: string }>(
    token.access_token,
    "/me?$select=mail,userPrincipalName",
  );

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
    scope: token.scope ?? GRAPH_SCOPES.join(" "),
    accountEmail: me.mail ?? me.userPrincipalName ?? "unknown",
  };
}

export async function outlookRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date }> {
  const token = await requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: GRAPH_SCOPES.join(" "),
  });
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
  };
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType: string; content: string };
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  receivedDateTime?: string;
  isRead?: boolean;
  categories?: string[];
}

interface GraphListResponse {
  value: GraphMessage[];
  "@odata.nextLink"?: string;
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

export async function outlookFetchRecent(
  accessToken: string,
  max = 500,
): Promise<NormalizedEmail[]> {
  const out: NormalizedEmail[] = [];
  const select =
    "id,conversationId,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,categories";
  let next: string | null =
    `/me/messages?$top=50&$orderby=receivedDateTime desc&$select=${select}`;

  while (next && out.length < max) {
    const page: GraphListResponse = next.startsWith("http")
      ? await fetch(next, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((r) => r.json())
      : await graphGet<GraphListResponse>(accessToken, next);

    for (const m of page.value ?? []) {
      const bodyRaw = m.body?.content ?? m.bodyPreview ?? "";
      const bodyText =
        m.body?.contentType === "html" ? stripHtml(bodyRaw) : bodyRaw.trim();

      out.push({
        externalId: m.id,
        threadId: m.conversationId ?? null,
        fromName: m.from?.emailAddress?.name ?? null,
        fromEmail: m.from?.emailAddress?.address ?? null,
        toEmails: (m.toRecipients ?? [])
          .map((r) => r.emailAddress?.address)
          .filter((a): a is string => Boolean(a)),
        subject: m.subject ?? null,
        snippet: m.bodyPreview ?? null,
        bodyText: bodyText.slice(0, 20000) || null,
        receivedAt: m.receivedDateTime
          ? new Date(m.receivedDateTime)
          : new Date(),
        isRead: m.isRead ?? true,
        labels: m.categories ?? [],
      });
      if (out.length >= max) break;
    }

    next = page["@odata.nextLink"] ?? null;
  }

  return out;
}
