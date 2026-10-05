import { describe, it, expect } from "vitest";
import { gmailSearchQuery } from "@/lib/gmail";

describe("gmailSearchQuery", () => {
  it("returns the inbox + sent query for a full sync (no cursor)", () => {
    expect(gmailSearchQuery()).toBe("in:inbox OR in:sent");
    expect(gmailSearchQuery(null)).toBe("in:inbox OR in:sent");
  });

  it("adds an `after:` Unix timestamp for an incremental sync", () => {
    const since = new Date("2026-01-01T00:00:00.000Z");
    const afterSeconds = Math.floor(since.getTime() / 1000);
    expect(gmailSearchQuery(since)).toBe(
      `(in:inbox OR in:sent) after:${afterSeconds}`,
    );
  });

  it("parenthesises the base query so `after:` applies to both labels", () => {
    expect(gmailSearchQuery(new Date()).startsWith("(in:inbox OR in:sent)")).toBe(
      true,
    );
  });
});
