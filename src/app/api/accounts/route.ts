import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/user";

export const dynamic = "force-dynamic";

export interface AccountSummary {
  id: string;
  provider: "GMAIL" | "OUTLOOK";
  accountEmail: string;
  syncStatus: "IDLE" | "SYNCING" | "COMPLETED" | "FAILED";
  lastSyncedAt: string | null;
  syncError: string | null;
  emailCount: number;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const accounts = await prisma.connectedAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        provider: true,
        accountEmail: true,
        syncStatus: true,
        lastSyncedAt: true,
        syncError: true,
        _count: { select: { emails: true } },
      },
    });

    const summaries: AccountSummary[] = accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      accountEmail: a.accountEmail,
      syncStatus: a.syncStatus,
      lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
      syncError: a.syncError,
      emailCount: a._count.emails,
    }));

    return NextResponse.json({ accounts: summaries });
  } catch (e) {
    console.error("List accounts failed:", e);
    return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 });
  }
}
