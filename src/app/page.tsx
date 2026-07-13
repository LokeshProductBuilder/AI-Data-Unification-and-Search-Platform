import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent shadow-glow" />
          <span className="font-mono text-sm font-medium tracking-tight">
            unify
          </span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/sign-in"
            className="text-fg-muted transition-colors hover:text-fg"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-accent px-3 py-1.5 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-bg-raised px-3 py-1 font-mono text-2xs text-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Gmail · Outlook · Claude
        </div>
        <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight">
          One search bar for
          <br />
          <span className="text-accent-bright">all of your email.</span>
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-base text-fg-muted">
          Connect Gmail and Outlook, and Unify pulls in your messages, embeds
          them, and lets you ask questions in plain language — answered by Claude,
          with citations to the exact emails.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Connect your inbox
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-border bg-bg-raised px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:border-border-strong"
          >
            Sign in
          </Link>
        </div>
      </section>

      <footer className="relative z-10 px-6 py-5 text-center font-mono text-2xs text-fg-faint">
        built with next.js · prisma · pgvector · anthropic
      </footer>
    </main>
  );
}
