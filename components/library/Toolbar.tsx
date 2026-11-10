"use client";

import { ArrowUpDown, CheckSquare, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { SORT_OPTIONS } from "@/lib/sort";
import type { MediaKind, SortKey } from "@/lib/types";

export type KindFilter = "all" | MediaKind;

const KINDS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

interface ToolbarProps {
  showKindFilter: boolean;
  kind: KindFilter;
  onKindChange: (kind: KindFilter) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  selecting: boolean;
  onToggleSelecting: () => void;
  canSelect: boolean;
}

export function Toolbar({
  showKindFilter,
  kind,
  onKindChange,
  sort,
  onSortChange,
  selecting,
  onToggleSelecting,
  canSelect,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {showKindFilter && (
        <div role="tablist" aria-label="Filter by type" className="flex rounded-xl border border-line bg-surface p-1">
          {KINDS.map((option) => (
            <button
              key={option.value}
              role="tab"
              type="button"
              aria-selected={kind === option.value}
              onClick={() => onKindChange(option.value)}
              className={cn(
                "h-9 rounded-lg px-3.5 text-sm font-medium outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:px-4",
                kind === option.value ? "bg-violet-500/20 text-violet-200 shadow-[inset_0_0_0_1px_rgb(139_92_246/0.35)]" : "text-zinc-400 hover:text-white",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <label className="relative">
          <span className="sr-only">Sort files</span>
          <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
            className="h-11 appearance-none rounded-xl border border-line bg-surface pl-9 pr-9 text-sm font-medium text-zinc-200 outline-none transition hover:border-white/20 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10 sm:h-[46px]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-overlay">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        </label>

        {canSelect && (
          <Button
            variant={selecting ? "primary" : "secondary"}
            className="sm:h-[46px]"
            icon={selecting ? <X className="size-4" /> : <CheckSquare className="size-4" />}
            onClick={onToggleSelecting}
          >
            {selecting ? "Cancel" : "Select"}
          </Button>
        )}
      </div>
    </div>
  );
}
