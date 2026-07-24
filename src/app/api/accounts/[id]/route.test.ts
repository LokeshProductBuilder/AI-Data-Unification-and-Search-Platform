import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the data + auth layers so we can unit-test the route in isolation.
const findFirst = vi.fn();
const del = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    connectedAccount: {
      findFirst: (...args: unknown[]) => findFirst(...args),
      delete: (...args: unknown[]) => del(...args),
    },
  },
}));
vi.mock("@/lib/user", () => ({
  requireUserId: vi.fn(async () => "user_123"),
}));

import { DELETE } from "@/app/api/accounts/[id]/route";

const makeReq = () =>
  new Request("http://localhost/api/accounts/acc_1", {
    method: "DELETE",
  }) as never;

beforeEach(() => {
  findFirst.mockReset();
  del.mockReset();
});

describe("DELETE /api/accounts/[id]", () => {
  it("disconnects the account and reports how many emails were deleted", async () => {
    findFirst.mockResolvedValue({ id: "acc_1", _count: { emails: 42 } });
    del.mockResolvedValue({});

    const res = await DELETE(makeReq(), { params: { id: "acc_1" } });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ success: true, deletedEmails: 42 });
    expect(del).toHaveBeenCalledWith({ where: { id: "acc_1" } });
  });

  it("scopes the lookup to the signed-in user (no cross-account deletes)", async () => {
    findFirst.mockResolvedValue({ id: "acc_1", _count: { emails: 0 } });
    del.mockResolvedValue({});

    await DELETE(makeReq(), { params: { id: "acc_1" } });

    const queryArg = findFirst.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(queryArg.where).toMatchObject({ id: "acc_1", userId: "user_123" });
  });

  it("returns 404 and does not delete when the account is not the user's", async () => {
    findFirst.mockResolvedValue(null);

    const res = await DELETE(makeReq(), { params: { id: "acc_1" } });
    expect(res.status).toBe(404);
    expect(del).not.toHaveBeenCalled();
  });
});
