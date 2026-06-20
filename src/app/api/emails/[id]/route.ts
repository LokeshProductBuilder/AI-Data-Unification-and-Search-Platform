import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/user";
import type { EmailDetailItem } from "@/types";

export const dynamic = "force-dynamic";

/** Full content of a single email, scoped to the signed-in user. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await requireUserId();

    // Scope by userId so one user can never read another's email by id.
    const email = await prisma.email.findFirst({
      where: { id: params.id, userId },
      select: {
        id: true,
        provider: true,
        fromName: true,
        fromEmail: true,
        toEmails: true,
        subject: true,
        bodyText: true,
        snippet: true,
        receivedAt: true,
        isRead: true,
        labels: true,
      },
    });

    if (!email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const detail: EmailDetailItem = {
      ...email,
      receivedAt: email.receivedAt.toISOString(),
    };

    return NextResponse.json({ email: detail });
  } catch (e) {
    console.error("Load email failed:", e);
    return NextResponse.json({ error: "Failed to load email" }, { status: 500 });
  }
}
