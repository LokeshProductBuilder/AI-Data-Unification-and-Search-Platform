/**
 * Centralised, lazily-validated environment access.
 *
 * Server-only secrets are read through `serverEnv()` so that a missing value
 * fails loudly at the call site instead of silently producing `undefined`.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const appUrl = (): string =>
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const serverEnv = {
  databaseUrl: () => required("DATABASE_URL"),
  tokenEncryptionKey: () => required("TOKEN_ENCRYPTION_KEY"),

  googleClientId: () => required("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => required("GOOGLE_CLIENT_SECRET"),

  microsoftClientId: () => required("MICROSOFT_CLIENT_ID"),
  microsoftClientSecret: () => required("MICROSOFT_CLIENT_SECRET"),
  microsoftTenantId: () => process.env.MICROSOFT_TENANT_ID ?? "common",

  openaiApiKey: () => required("OPENAI_API_KEY"),
  anthropicApiKey: () => required("ANTHROPIC_API_KEY"),

  inngestEventKey: () => optional("INNGEST_EVENT_KEY"),
  inngestSigningKey: () => optional("INNGEST_SIGNING_KEY"),
};

/** OAuth redirect URIs, derived from the app URL so dev/prod stay in sync. */
export const redirectUri = {
  gmail: () => `${appUrl()}/api/connect/gmail/callback`,
  outlook: () => `${appUrl()}/api/connect/outlook/callback`,
};
