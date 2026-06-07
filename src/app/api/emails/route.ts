import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/user";
import type { Provider } from "@prisma/client";
import type { EmailListItem } from "@/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/**
 * Paginated, date-sorted email list for the signed-in user.
 * Cursor-based: pass ?cursor=<id> to fetch the next page.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const providerParam = searchParams.get("provider");
    const provider =
      providerParam === "GMAIL" || providerParam === "OUTLOOK"
        ? (providerParam as Provider)
        : undefined;

    const rows = await prisma.email.findMany({
      where: { userId, ...(provider ? { provider } : {}) },
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        provider: true,
        fromName: true,
        fromEmail: true,
        subject: true,
        snippet: true,
        receivedAt: true,
        isRead: true,
      },
    });

    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    const emails: EmailListItem[] = page.map((e) => ({
      ...e,
      receivedAt: e.receivedAt.toISOString(),
    }));

    return NextResponse.json({
      emails,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (e) {
    console.error("List emails failed:", e);
    return NextResponse.json({ error: "Failed to load emails" }, { status: 500 });
  }
}
