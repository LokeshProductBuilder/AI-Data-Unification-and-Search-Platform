"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchCitation } from "@/types";
import { ProviderBadge } from "@/components/provider-badge";
import { formatEmailDate, displaySender } from "@/lib/format";

type StreamEvent =
  | { type: "sources"; sources: SearchCitation[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SearchCitation[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcuts: "/" or ⌘K / Ctrl+K focuses search, Esc blurs it.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || streaming) return;

    setStreaming(true);
    setError(null);
    setAnswer("");
    setSources([]);
    setOpen(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok || !res.body) {
        throw new Error("Search request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Parse newline-delimited JSON events as they arrive.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "sources") setSources(event.sources);
          else if (event.type === "delta") setAnswer((a) => a + event.text);
          else if (event.type === "error") setError(event.message);
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  const reset = () => {
    setOpen(false);
    setAnswer("");
    setSources([]);
    setError(null);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="border-b border-border bg-bg-subtle">
      <form onSubmit={run} className="px-4 py-3">
        <div className="group flex items-center gap-3 rounded-lg border border-border bg-bg-raised px-3.5 py-2.5 transition-colors focus-within:border-accent/60 focus-within:shadow-glow">
          <SearchGlyph streaming={streaming} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your email — “what did Stripe say about the failed payment?”"
            className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none"
            autoComplete="off"
          />
          {!open && query.length === 0 && (
            <kbd className="pointer-events-none hidden shrink-0 items-center gap-0.5 rounded border border-border bg-bg-overlay px-1.5 py-0.5 font-mono text-2xs text-fg-subtle sm:inline-flex">
              ⌘K
            </kbd>
          )}
          {open && (
            <button
              type="button"
              onClick={reset}
              className="shrink-0 rounded px-1.5 py-0.5 font-mono text-2xs text-fg-subtle hover:text-fg"
            >
              clear
            </button>
          )}
          <button
            type="submit"
            disabled={streaming || query.trim().length === 0}
            className="shrink-0 rounded-md bg-accent px-3 py-1.5 font-mono text-2xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {streaming ? "Searching…" : "Ask"}
          </button>
        </div>
      </form>

      {open && (
        <div className="animate-fade-in px-4 pb-4">
          <div className="rounded-lg border border-border bg-bg-raised">
            <div className="border-b border-border-subtle px-4 py-3">
              <div className="mb-1 font-mono text-2xs uppercase tracking-widest text-accent-bright">
                Answer
              </div>
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
                  {answer}
                  {streaming && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />
                  )}
                </p>
              )}
            </div>

            {sources.length > 0 && (
              <div className="px-4 py-3">
                <div className="mb-2 font-mono text-2xs uppercase tracking-widest text-fg-subtle">
                  {sources.length} sources
                </div>
                <ol className="space-y-1">
                  {sources.map((s, i) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-2 text-2xs"
                    >
                      <span className="w-5 shrink-0 text-right font-mono text-fg-faint">
                        {i + 1}
                      </span>
                      <ProviderBadge provider={s.provider} className="shrink-0" />
                      <span className="w-40 shrink-0 truncate text-fg-muted">
                        {displaySender(s.fromName, s.fromEmail)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-fg">
                        {s.subject || "(no subject)"}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-fg-subtle">
                        {formatEmailDate(s.receivedAt)}
                      </span>
                      <span className="w-12 shrink-0 text-right font-mono tabular-nums text-fg-faint">
                        {(s.similarity * 100).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchGlyph({ streaming }: { streaming: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${streaming ? "animate-pulse text-accent" : "text-fg-subtle"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
