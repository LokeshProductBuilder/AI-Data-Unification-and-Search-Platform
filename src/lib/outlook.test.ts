import { describe, it, expect } from "vitest";
import { outlookMessagesPath } from "@/lib/outlook";

const SELECT = "id,subject,receivedDateTime";

describe("outlookMessagesPath", () => {
  it("builds a recent-messages query with no cursor (full sync)", () => {
    const path = outlookMessagesPath(SELECT);
    expect(path).toContain("/me/messages?");
    expect(path).toContain("$top=50");
    expect(path).toContain("$orderby=receivedDateTime desc");
    expect(path).toContain(`$select=${SELECT}`);
    expect(path).not.toContain("$filter");
  });

  it("adds a receivedDateTime filter for an incremental sync", () => {
    const since = new Date("2026-01-01T00:00:00.000Z");
    const path = outlookMessagesPath(SELECT, since);
    expect(path).toContain(
      "$filter=receivedDateTime gt 2026-01-01T00:00:00.000Z",
    );
  });

  it("omits the filter when since is null", () => {
    expect(outlookMessagesPath(SELECT, null)).not.toContain("$filter");
  });
});
