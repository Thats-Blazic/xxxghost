"use client";

import { HardDrive, ShieldCheck, ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useStorageEstimate } from "@/hooks/useStorageEstimate";
import { usePersistentStorage } from "@/hooks/usePersistentStorage";
import { formatBytes } from "@/lib/format";

/** Compact storage meter shown at the bottom of the sidebar / drawer. */
export function SidebarStorage() {
  const { items } = useLibrary();
  const toast = useToast();
  const { persisted, request } = usePersistentStorage();
  const used = useMemo(() => items.reduce((sum, item) => sum + item.size, 0), [items]);
  const estimate = useStorageEstimate(used);
  const percent = estimate ? Math.min(100, Math.max(used > 0 ? 1.5 : 0, (used / estimate.quota) * 100)) : 0;

  async function protect() {
    const granted = await request();
    toast(
      granted
        ? { type: "success", title: "Storage protected", description: "Your browser won't delete your files automatically." }
        : {
            type: "info",
            title: "Your browser said no",
            description: "Try installing the app to your home screen or bookmarking the site, then press the button again.",
            duration: 7000,
          },
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-raised/70 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        <HardDrive className="size-4 text-violet-300" />
        Local storage
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-zinc-500">
        <span className="font-medium text-zinc-300">{formatBytes(used)}</span> used
        {estimate ? ` · ${formatBytes(Math.max(0, estimate.quota - estimate.usage), 0)} free` : ""}
      </p>

      {persisted === true && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
          <ShieldCheck className="size-3.5" />
          Protected from auto-cleanup
        </p>
      )}
      {persisted === false && (
        <button
          type="button"
          onClick={() => void protect()}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
        >
          <ShieldAlert className="size-3.5" />
          Protect storage
        </button>
      )}
      {persisted === null && <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">Saved on this device only.</p>}
    </div>
  );
}
