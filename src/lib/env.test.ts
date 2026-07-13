import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appUrl, serverEnv, redirectUri } from "@/lib/env";

const ORIGINAL = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL };
});

afterEach(() => {
  process.env = ORIGINAL;
});

describe("serverEnv.required", () => {
  it("returns the value when the variable is set", () => {
    process.env.DATABASE_URL = "postgres://example";
    expect(serverEnv.databaseUrl()).toBe("postgres://example");
  });

  it("throws a descriptive error when the variable is missing", () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => serverEnv.openaiApiKey()).toThrowError(
      /Missing required environment variable: OPENAI_API_KEY/,
    );
  });

  it("treats an empty string as missing", () => {
    process.env.ANTHROPIC_API_KEY = "";
    expect(() => serverEnv.anthropicApiKey()).toThrowError(
      /ANTHROPIC_API_KEY/,
    );
  });
});

describe("serverEnv optional + defaults", () => {
  it("returns undefined for an unset optional variable", () => {
    delete process.env.INNGEST_EVENT_KEY;
    expect(serverEnv.inngestEventKey()).toBeUndefined();
  });

  it("defaults the Microsoft tenant to 'common' when unset", () => {
    delete process.env.MICROSOFT_TENANT_ID;
    expect(serverEnv.microsoftTenantId()).toBe("common");
  });
});

describe("appUrl", () => {
  it("falls back to localhost when NEXT_PUBLIC_APP_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("uses the configured URL when present", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://unify.example.com";
    expect(appUrl()).toBe("https://unify.example.com");
  });
});

describe("redirectUri", () => {
  it("derives provider callbacks from the app URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://unify.example.com";
    expect(redirectUri.gmail()).toBe(
      "https://unify.example.com/api/connect/gmail/callback",
    );
    expect(redirectUri.outlook()).toBe(
      "https://unify.example.com/api/connect/outlook/callback",
    );
  });
});
