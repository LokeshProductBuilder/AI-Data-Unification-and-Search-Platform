"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Provider } from "@prisma/client";
import type { EmailListItem } from "@/types";
import { ProviderBadge } from "@/components/provider-badge";
import { EmailDetail } from "@/components/email-detail";
import { formatEmailDate, formatFullDate, displaySender } from "@/lib/format";

type Filter = "ALL" | Provider;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "GMAIL", label: "Gmail" },
  { key: "OUTLOOK", label: "Outlook" },
];

export function EmailList({ initialTotal }: { initialTotal: number }) {
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (!reset && cursor) params.set("cursor", cursor);
      if (filter !== "ALL") params.set("provider", filter);

      const res = await fetch(`/api/emails?${params.toString()}`);
      const data = (await res.json()) as {
        emails: EmailListItem[];
        nextCursor: string | null;
      };

      setEmails((prev) => (reset ? data.emails : [...prev, ...data.emails]));
      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
      setLoading(false);
    },
    [cursor, filter],
  );

  // Reload from scratch when the filter changes.
  useEffect(() => {
    setEmails([]);
    setCursor(null);
    setHasMore(true);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          void load(false);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, load]);

  return (
    <section className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-2xs uppercase tracking-widest text-fg-subtle">
            Inbox
          </h2>
          <span className="font-mono text-2xs text-fg-faint">
            {initialTotal.toLocaleString()} messages
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-bg-raised p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded px-2 py-1 font-mono text-2xs transition-colors ${
                filter === f.key
                  ? "bg-accent/15 text-accent-bright"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <ul className="divide-y divide-border-subtle">
        {emails.map((email) => (
          <li key={email.id}>
            <button
              type="button"
              onClick={() => setSelectedId(email.id)}
              className={`group flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-bg-subtle ${
                selectedId === email.id ? "bg-bg-subtle" : ""
              }`}
            >
              <ProviderBadge provider={email.provider} className="shrink-0" />
              <span
                className={`w-44 shrink-0 truncate text-sm ${
                  email.isRead ? "text-fg-muted" : "font-semibold text-fg"
                }`}
              >
                {displaySender(email.fromName, email.fromEmail)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className={email.isRead ? "text-fg" : "font-semibold text-fg"}>
                  {email.subject || "(no subject)"}
                </span>
                <span className="ml-2 text-fg-subtle">{email.snippet}</span>
              </span>
              <time
                dateTime={email.receivedAt}
                title={formatFullDate(email.receivedAt)}
                className="shrink-0 font-mono text-2xs tabular-nums text-fg-subtle"
              >
                {formatEmailDate(email.receivedAt)}
              </time>
            </button>
          </li>
        ))}
      </ul>

      {emails.length === 0 && !loading && (
        <div className="px-4 py-16 text-center font-mono text-2xs text-fg-faint">
          No emails yet. Connect an account and sync to get started.
        </div>
      )}

      <div ref={sentinel} />
      {loading && (
        <div className="px-4 py-4 text-center font-mono text-2xs text-fg-faint">
          Loading…
        </div>
      )}

      <EmailDetail emailId={selectedId} onClose={() => setSelectedId(null)} />
    </section>
  );
}
