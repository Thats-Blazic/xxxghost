"use client";

import { Cloud, Lock } from "lucide-react";
import { useMemo } from "react";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { formatBytes, pluralize } from "@/lib/format";

/** Compact cloud-storage summary shown at the bottom of the sidebar / drawer. */
export function SidebarStorage() {
  const { items, status, passwordRequired, lock } = useLibrary();
  const used = useMemo(() => items.reduce((sum, item) => sum + item.size, 0), [items]);

  return (
    <div className="rounded-2xl border border-line bg-raised/70 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        <Cloud className="size-4 text-violet-300" />
        Cloud storage
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{status === "ready" ? formatBytes(used) : "—"}</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {status === "ready" ? `${pluralize(items.length, "file")} stored online` : "Connecting…"}
      </p>
      {passwordRequired && status === "ready" && (
        <button
          type="button"
          onClick={() => void lock()}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
        >
          <Lock className="size-3.5" />
          Lock vault
        </button>
      )}
    </div>
  );
}
