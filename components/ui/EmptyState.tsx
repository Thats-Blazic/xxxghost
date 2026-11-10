import type { ComponentType, ReactNode } from "react";

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex animate-rise flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-3xl"
      />
      <div className="relative mb-6">
        <div className="absolute inset-0 animate-pulse-glow rounded-3xl bg-violet-500/30 blur-xl" />
        <div className="relative flex size-20 items-center justify-center rounded-3xl border border-violet-400/25 bg-gradient-to-b from-violet-500/20 to-violet-500/5">
          <Icon className="size-9 text-violet-300" />
        </div>
      </div>
      <h3 className="relative text-xl font-semibold tracking-tight text-white">{title}</h3>
      <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">{description}</p>
      {action && <div className="relative mt-7">{action}</div>}
    </div>
  );
}
