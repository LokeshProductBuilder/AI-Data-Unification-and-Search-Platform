import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { syncCurrentUser } from "@/lib/user";
import { TopBar } from "@/components/top-bar";
import { AccountsPanel } from "@/components/accounts-panel";
import { SearchBar } from "@/components/search-bar";
import { EmailList } from "@/components/email-list";
import type { AccountSummary } from "@/app/api/accounts/route";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await syncCurrentUser();
  if (!user) redirect("/sign-in");

  const [accountRows, totalEmails] = await Promise.all([
    prisma.connectedAccount.findMany({
      where: { userId: user.id },
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
    }),
    prisma.email.count({ where: { userId: user.id } }),
  ]);

  const accounts: AccountSummary[] = accountRows.map((a) => ({
    id: a.id,
    provider: a.provider,
    accountEmail: a.accountEmail,
    syncStatus: a.syncStatus,
    lastSyncedAt: a.lastSyncedAt?.toISOString() ?? null,
    syncError: a.syncError,
    emailCount: a._count.emails,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />

      <div className="border-b border-border bg-bg-subtle px-4 py-2.5">
        {accounts.length === 0 ? (
          <EmptyConnect />
        ) : (
          <AccountsPanel initial={accounts} />
        )}
      </div>

      <SearchBar />

      <main className="flex-1">
        <EmailList initialTotal={totalEmails} />
      </main>
    </div>
  );
}

function EmptyConnect() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        <span className="text-sm text-fg-muted">
          Connect a mailbox to pull in your last 500 emails and start searching.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <a
          href="/api/connect/gmail"
          className="rounded-md border border-border bg-bg-raised px-3 py-1.5 font-mono text-2xs text-fg transition-colors hover:border-provider-gmail/50"
        >
          + Connect Gmail
        </a>
        <a
          href="/api/connect/outlook"
          className="rounded-md border border-border bg-bg-raised px-3 py-1.5 font-mono text-2xs text-fg transition-colors hover:border-provider-outlook/50"
        >
          + Connect Outlook
        </a>
      </div>
    </div>
  );
}
