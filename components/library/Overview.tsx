"use client";

import { Film, FolderOpen, HardDrive, Image as ImageIcon, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useStorageEstimate } from "@/hooks/useStorageEstimate";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import type { MediaMeta } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone: string;
  delay: number;
  loading: boolean;
}

function StatCard({ icon: Icon, label, value, hint, tone, delay, loading }: StatCardProps) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="group relative animate-rise overflow-hidden rounded-2xl border border-line bg-surface p-4 transition duration-300 can-hover:hover:border-violet-400/30 sm:p-5"
    >
      <div
        aria-hidden
        className={cn("pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40", tone)}
      />
      <div className="relative flex items-center gap-2.5 text-sm text-zinc-400">
        <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-raised">
          <Icon className="size-4 text-violet-300" />
        </span>
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-8 w-24" />
      ) : (
        <p className="relative mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      <p className="relative mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function StorageCard({ items, loading }: { items: MediaMeta[]; loading: boolean }) {
  const stats = useMemo(() => computeStats(items), [items]);
  const estimate = useStorageEstimate(stats.totalBytes);
  const total = stats.totalBytes || 1;
  const segments = [
    { label: "Images", bytes: stats.imageBytes, color: "bg-violet-500" },
    { label: "Videos", bytes: stats.videoBytes, color: "bg-fuchsia-500" },
    { label: "Trash", bytes: stats.trashBytes, color: "bg-zinc-600" },
  ];
  const quotaPercent = estimate ? (stats.totalBytes / estimate.quota) * 100 : null;

  return (
    <div className="relative animate-rise overflow-hidden rounded-2xl border border-line bg-surface p-5 [animation-delay:240ms] sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 size-48 rounded-full bg-violet-600/15 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-sm text-zinc-400">
          <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-raised">
            <HardDrive className="size-4 text-violet-300" />
          </span>
          Storage used
        </div>
        {estimate && quotaPercent !== null && (
          <span className="rounded-md bg-white/6 px-2 py-1 text-[11px] font-medium tabular-nums text-zinc-400">
            {quotaPercent < 0.1 ? "<0.1" : quotaPercent.toFixed(1)}% of browser quota
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="relative mt-4 h-9 w-32" />
      ) : (
        <p className="relative mt-4 text-4xl font-semibold tracking-tight">{formatBytes(stats.totalBytes)}</p>
      )}
      {estimate && (
        <p className="relative mt-1 text-xs text-zinc-500">{formatBytes(estimate.quota - estimate.usage, 0)} still free in this browser</p>
      )}

      <div className="relative mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/6">
        {stats.totalBytes > 0 &&
          segments.map((segment) => (
            <div
              key={segment.label}
              className={cn("h-full transition-[width] duration-700 first:rounded-l-full last:rounded-r-full", segment.color)}
              style={{ width: `${(segment.bytes / total) * 100}%` }}
            />
          ))}
      </div>

      <ul className="relative mt-4 grid grid-cols-3 gap-2">
        {segments.map((segment) => (
          <li key={segment.label} className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className={cn("size-2 rounded-full", segment.color)} />
              {segment.label}
            </div>
            <p className="mt-1 truncate text-sm font-medium tabular-nums text-zinc-200">{formatBytes(segment.bytes)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Overview({ items, loading }: { items: MediaMeta[]; loading: boolean }) {
  const stats = useMemo(() => computeStats(items), [items]);

  return (
    <section aria-label="Overview" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          icon={FolderOpen}
          label="Total files"
          value={stats.files.toLocaleString("en-US")}
          hint="In your vault"
          tone="bg-violet-500"
          delay={0}
          loading={loading}
        />
        <StatCard
          icon={HardDrive}
          label="Space used"
          value={formatBytes(stats.activeBytes)}
          hint="Without Trash"
          tone="bg-indigo-500"
          delay={60}
          loading={loading}
        />
        <StatCard
          icon={ImageIcon}
          label="Images"
          value={stats.images.toLocaleString("en-US")}
          hint={formatBytes(stats.imageBytes)}
          tone="bg-fuchsia-500"
          delay={120}
          loading={loading}
        />
        <StatCard
          icon={Film}
          label="Videos"
          value={stats.videos.toLocaleString("en-US")}
          hint={formatBytes(stats.videoBytes)}
          tone="bg-purple-500"
          delay={180}
          loading={loading}
        />
      </div>
      <StorageCard items={items} loading={loading} />
    </section>
  );
}
