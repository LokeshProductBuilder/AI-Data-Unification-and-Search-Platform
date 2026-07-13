import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB + embedding layers so we can test the query wiring in isolation.
const queryRaw = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: (...args: unknown[]) => queryRaw(...args) },
}));
vi.mock("@/lib/embeddings", () => ({
  embedText: vi.fn(async () => [0.1, 0.2, 0.3]),
  toVectorLiteral: (v: number[]) => `[${v.join(",")}]`,
}));

import { semanticSearch } from "@/lib/search";
import { embedText } from "@/lib/embeddings";

const sampleRow = {
  id: "em_1",
  provider: "GMAIL" as const,
  fromName: "Stripe",
  fromEmail: "billing@stripe.com",
  subject: "Payment failed",
  snippet: "Your card was declined.",
  bodyText: "Your card was declined.",
  receivedAt: new Date("2026-06-03T10:00:00.000Z"),
  similarity: 0.87,
};

beforeEach(() => {
  queryRaw.mockReset();
  vi.mocked(embedText).mockClear();
});

describe("semanticSearch", () => {
  it("embeds the query text before searching", async () => {
    queryRaw.mockResolvedValue([]);
    await semanticSearch("user_123", "when is my payment due");
    expect(embedText).toHaveBeenCalledWith("when is my payment due");
  });

  it("returns the rows produced by the vector query", async () => {
    queryRaw.mockResolvedValue([sampleRow]);
    const rows = await semanticSearch("user_123", "payment");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("em_1");
    expect(rows[0].similarity).toBeCloseTo(0.87);
  });

  it("scopes the query to the user and defaults the limit to 20", async () => {
    queryRaw.mockResolvedValue([]);
    await semanticSearch("user_123", "payment");

    // Tagged-template call: [strings, ...interpolatedValues]
    const values = queryRaw.mock.calls[0].slice(1);
    expect(values).toContain("user_123");
    expect(values).toContain(20);
  });

  it("respects a custom limit", async () => {
    queryRaw.mockResolvedValue([]);
    await semanticSearch("user_123", "payment", 5);

    const values = queryRaw.mock.calls[0].slice(1);
    expect(values).toContain(5);
    expect(values).not.toContain(20);
  });
});
