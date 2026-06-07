"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountSummary } from "@/app/api/accounts/route";
import { ProviderBadge } from "@/components/provider-badge";
import { formatFullDate } from "@/lib/format";

const STATUS_LABEL: Record<AccountSummary["syncStatus"], string> = {
  IDLE: "Queued",
  SYNCING: "Syncing…",
  COMPLETED: "Synced",
  FAILED: "Failed",
};

const STATUS_COLOR: Record<AccountSummary["syncStatus"], string> = {
  IDLE: "text-fg-subtle",
  SYNCING: "text-accent-bright",
  COMPLETED: "text-emerald-400",
  FAILED: "text-red-400",
};

export function AccountsPanel({ initial }: { initial: AccountSummary[] }) {
  const [accounts, setAccounts] = useState<AccountSummary[]>(initial);
  const [resyncing, setResyncing] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/accounts");
    if (!res.ok) return;
    const data = (await res.json()) as { accounts: AccountSummary[] };
    setAccounts(data.accounts);
  }, []);

  // Poll while any account is mid-sync so the UI reflects progress.
  useEffect(() => {
    const anySyncing = accounts.some(
      (a) => a.syncStatus === "SYNCING" || a.syncStatus === "IDLE",
    );
    if (!anySyncing) return;
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [accounts, refresh]);

  const resync = async () => {
    setResyncing(true);
    await fetch("/api/sync", { method: "POST" });
    await refresh();
    setResyncing(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {accounts.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-2 rounded-md border border-border bg-bg-raised px-2.5 py-1.5"
        >
          <ProviderBadge provider={a.provider} />
          <span className="max-w-[180px] truncate text-2xs text-fg-muted">
            {a.accountEmail}
          </span>
          <span
            className={`font-mono text-2xs ${STATUS_COLOR[a.syncStatus]}`}
            title={
              a.syncError ??
              (a.lastSyncedAt
                ? `Last synced ${formatFullDate(a.lastSyncedAt)}`
                : undefined)
            }
          >
            {a.syncStatus === "SYNCING" && (
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            )}
            {STATUS_LABEL[a.syncStatus]}
            {a.syncStatus === "COMPLETED" && a.emailCount > 0 && (
              <span className="text-fg-faint"> · {a.emailCount}</span>
            )}
          </span>
        </div>
      ))}

      <div className="ml-auto flex items-center gap-2">
        {accounts.length > 0 && (
          <button
            onClick={resync}
            disabled={resyncing}
            className="rounded-md border border-border bg-bg-raised px-2.5 py-1.5 font-mono text-2xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg disabled:opacity-50"
          >
            {resyncing ? "Queuing…" : "Re-sync"}
          </button>
        )}
        <a
          href="/api/connect/gmail"
          className="rounded-md border border-border bg-bg-raised px-2.5 py-1.5 font-mono text-2xs text-fg transition-colors hover:border-provider-gmail/50"
        >
          + Gmail
        </a>
        <a
          href="/api/connect/outlook"
          className="rounded-md border border-border bg-bg-raised px-2.5 py-1.5 font-mono text-2xs text-fg transition-colors hover:border-provider-outlook/50"
        >
          + Outlook
        </a>
      </div>
    </div>
  );
}
