import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/user";

export const dynamic = "force-dynamic";

/**
 * Disconnect a connected mailbox and delete all of its stored emails.
 *
 * The delete is scoped to the signed-in user so one user can never remove
 * another user's account by id. Emails are removed automatically via the
 * `onDelete: Cascade` relation on `Email.account`.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const userId = await requireUserId();

    const account = await prisma.connectedAccount.findFirst({
      where: { id: params.id, userId },
      select: { id: true, _count: { select: { emails: true } } },
    });

    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.connectedAccount.delete({ where: { id: account.id } });

    return NextResponse.json({
      success: true,
      deletedEmails: account._count.emails,
    });
  } catch (e) {
    console.error("Disconnect account failed:", e);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 },
    );
  }
}
