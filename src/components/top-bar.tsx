import { UserButton } from "@clerk/nextjs";

export function TopBar() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm bg-accent shadow-glow" />
        <span className="font-mono text-sm font-medium tracking-tight">
          data unification
        </span>
        <span className="ml-1 rounded bg-bg-raised px-1.5 py-0.5 font-mono text-2xs text-fg-subtle">
          beta
        </span>
      </div>
      <UserButton
        appearance={{ elements: { avatarBox: "h-7 w-7" } }}
        afterSignOutUrl="/"
      />
    </header>
  );
}
