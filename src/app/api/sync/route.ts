import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/user";
import { inngest } from "@/inngest/client";

/** Re-trigger a sync for all of the signed-in user's connected accounts. */
export async function POST() {
  try {
    const userId = await requireUserId();
    const accounts = await prisma.connectedAccount.findMany({
      where: { userId },
      select: { id: true, provider: true },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ ok: false, error: "No connected accounts" }, { status: 400 });
    }

    await prisma.connectedAccount.updateMany({
      where: { userId },
      data: { syncStatus: "SYNCING", syncError: null },
    });

    await inngest.send(
      accounts.map((a) => ({
        name: "mailbox/sync.requested" as const,
        data: { accountId: a.id, provider: a.provider },
      })),
    );

    return NextResponse.json({ ok: true, queued: accounts.length });
  } catch (e) {
    console.error("Sync trigger failed:", e);
    return NextResponse.json({ ok: false, error: "Failed to queue sync" }, { status: 500 });
  }
}
