import type { Provider } from "@prisma/client";

const CONFIG: Record<Provider, { label: string; dot: string; text: string; ring: string }> = {
  GMAIL: {
    label: "Gmail",
    dot: "bg-provider-gmail",
    text: "text-provider-gmail",
    ring: "ring-provider-gmail/30",
  },
  OUTLOOK: {
    label: "Outlook",
    dot: "bg-provider-outlook",
    text: "text-provider-outlook",
    ring: "ring-provider-outlook/30",
  },
};

export function ProviderBadge({
  provider,
  className = "",
}: {
  provider: Provider;
  className?: string;
}) {
  const c = CONFIG[provider];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide ring-1 ring-inset ${c.text} ${c.ring} bg-bg-overlay ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
