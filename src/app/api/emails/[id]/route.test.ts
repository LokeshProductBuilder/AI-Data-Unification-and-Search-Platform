import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data + auth layers so we can unit-test the route's logic in
// isolation (no real database or Clerk session required).
const findFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { email: { findFirst: (...args: unknown[]) => findFirst(...args) } },
}));
vi.mock("@/lib/user", () => ({
  requireUserId: vi.fn(async () => "user_123"),
}));

import { GET } from "@/app/api/emails/[id]/route";

const sampleEmail = {
  id: "em_1",
  provider: "GMAIL" as const,
  fromName: "Stripe",
  fromEmail: "billing@stripe.com",
  toEmails: ["me@example.com"],
  subject: "Payment failed",
  bodyText: "Your card was declined.",
  snippet: "Your card was declined.",
  receivedAt: new Date("2026-06-03T10:00:00.000Z"),
  isRead: false,
  labels: ["INBOX"],
};

const makeReq = () =>
  new Request("http://localhost/api/emails/em_1") as never;

beforeEach(() => findFirst.mockReset());

describe("GET /api/emails/[id]", () => {
  it("returns the email and serializes the date to ISO", async () => {
    findFirst.mockResolvedValue(sampleEmail);

    const res = await GET(makeReq(), { params: { id: "em_1" } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.email.id).toBe("em_1");
    expect(body.email.receivedAt).toBe("2026-06-03T10:00:00.000Z");
    expect(body.email.subject).toBe("Payment failed");
  });

  it("scopes the lookup to the signed-in user (no cross-account reads)", async () => {
    findFirst.mockResolvedValue(sampleEmail);

    await GET(makeReq(), { params: { id: "em_1" } });

    const queryArg = findFirst.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(queryArg.where).toMatchObject({ id: "em_1", userId: "user_123" });
  });

  it("returns 404 when no email matches for this user", async () => {
    findFirst.mockResolvedValue(null);

    const res = await GET(makeReq(), { params: { id: "missing" } });
    expect(res.status).toBe(404);
  });
});
