"use client";

import { useEffect, useState } from "react";
import type { EmailDetailItem } from "@/types";
import { ProviderBadge } from "@/components/provider-badge";
import { formatFullDate, displaySender } from "@/lib/format";

export function EmailDetail({
  emailId,
  onClose,
}: {
  emailId: string | null;
  onClose: () => void;
}) {
  const [email, setEmail] = useState<EmailDetailItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the full email whenever the selected id changes.
  useEffect(() => {
    if (!emailId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEmail(null);

    fetch(`/api/emails/${emailId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
      .then((data: { email: EmailDetailItem }) => {
        if (!cancelled) setEmail(data.email);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this email.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [emailId]);

  // Close on Escape.
  useEffect(() => {
    if (!emailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [emailId, onClose]);

  if (!emailId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg-raised shadow-2xl animate-fade-in">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="font-mono text-2xs uppercase tracking-widest text-fg-subtle">
            Message
          </span>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 font-mono text-2xs text-fg-subtle transition-colors hover:bg-bg-overlay hover:text-fg"
          >
            Esc ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="px-5 py-16 text-center font-mono text-2xs text-fg-faint">
              Loading…
            </div>
          )}
          {error && (
            <div className="px-5 py-16 text-center font-mono text-2xs text-red-400">
              {error}
            </div>
          )}

          {email && (
            <article className="px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <ProviderBadge provider={email.provider} />
                {!email.isRead && (
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-2xs text-accent-bright">
                    unread
                  </span>
                )}
              </div>

              <h1 className="text-balance text-lg font-semibold leading-snug text-fg">
                {email.subject || "(no subject)"}
              </h1>

              <dl className="mt-4 space-y-1.5 border-y border-border-subtle py-3 font-mono text-2xs">
                <Row label="From">
                  <span className="text-fg">
                    {displaySender(email.fromName, email.fromEmail)}
                  </span>
                  {email.fromName && email.fromEmail && (
                    <span className="text-fg-subtle"> · {email.fromEmail}</span>
                  )}
                </Row>
                {email.toEmails.length > 0 && (
                  <Row label="To">
                    <span className="text-fg-muted">
                      {email.toEmails.join(", ")}
                    </span>
                  </Row>
                )}
                <Row label="Date">
                  <span className="text-fg-muted">
                    {formatFullDate(email.receivedAt)}
                  </span>
                </Row>
                {email.labels.length > 0 && (
                  <Row label="Labels">
                    <span className="text-fg-subtle">
                      {email.labels.join(", ")}
                    </span>
                  </Row>
                )}
              </dl>

              <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg-muted">
                {email.bodyText?.trim() || email.snippet || "(no content)"}
              </div>
            </article>
          )}
        </div>
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-12 shrink-0 uppercase tracking-wide text-fg-faint">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}
