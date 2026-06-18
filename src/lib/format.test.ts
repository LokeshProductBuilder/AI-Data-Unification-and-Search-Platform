import { describe, it, expect } from "vitest";
import { formatEmailDate, formatFullDate, displaySender } from "@/lib/format";

describe("format: displaySender", () => {
  it("prefers the display name when present", () => {
    expect(displaySender("Dana Whitfield", "dana@acme.com")).toBe(
      "Dana Whitfield",
    );
  });

  it("falls back to the email when there is no name", () => {
    expect(displaySender(null, "dana@acme.com")).toBe("dana@acme.com");
    expect(displaySender("   ", "dana@acme.com")).toBe("dana@acme.com");
  });

  it("falls back to 'Unknown sender' when nothing is available", () => {
    expect(displaySender(null, null)).toBe("Unknown sender");
  });
});

describe("format: dates", () => {
  it("formats a same-day timestamp as a time (contains a colon)", () => {
    const now = new Date();
    now.setHours(9, 30, 0, 0);
    expect(formatEmailDate(now.toISOString())).toContain(":");
  });

  it("formats an older date without throwing and as a non-empty string", () => {
    const old = "2024-01-15T12:00:00.000Z";
    const out = formatEmailDate(old);
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain(":"); // not a time, since it's not today
  });

  it("formatFullDate returns a readable string", () => {
    const out = formatFullDate("2024-01-15T12:00:00.000Z");
    expect(out.length).toBeGreaterThan(0);
  });
});
