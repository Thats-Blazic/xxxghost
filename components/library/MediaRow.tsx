"use client";

import { Ellipsis, Play, Star } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, type MenuPosition } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import { getExtension } from "@/lib/media";
import { SelectCheck } from "./SelectCheck";
import type { ItemViewProps } from "./MediaCard";
import { Thumb } from "./Thumb";
import { useFileMenu } from "./useFileMenu";

export function MediaRow({ item, selected, selecting, selectable = true, onOpen, onToggleSelect, onRemoved }: ItemViewProps) {
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const items = useFileMenu(item, { onPreview: onOpen, onSelect: selectable ? onToggleSelect : undefined, onRemoved });

  function openMenuFromButton(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({ x: rect.right, y: rect.bottom, alignRight: true });
  }

  return (
    <div
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY });
      }}
      className={cn(
        "group relative flex items-center gap-2 rounded-2xl border bg-surface p-2 pr-1.5 transition duration-200 sm:gap-3 sm:pr-2",
        "can-hover:hover:border-violet-400/35 can-hover:hover:bg-raised",
        selected ? "border-violet-400 bg-violet-500/8" : "border-line",
      )}
    >
      {selectable && (
        <SelectCheck
          checked={selected}
          onChange={onToggleSelect}
          label={`Select ${item.name}`}
          className={cn(
            "ml-1 shrink-0 !border-zinc-600 !bg-transparent",
            selected && "!border-violet-400 !bg-violet-500",
            !selecting && !selected && "can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:focus-visible:opacity-100",
          )}
        />
      )}

      <button
        type="button"
        onClick={() => (selecting && selectable ? onToggleSelect() : onOpen())}
        aria-label={`${selecting ? "Select" : "Open"} ${item.name}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:gap-4"
      >
        <div className="relative shrink-0">
          <Thumb item={item} className="size-14 rounded-xl sm:size-16" iconClassName="size-6" />
          {item.kind === "video" && (
            <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
              <Play className="size-4 fill-white text-white" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-white">
            <span className="truncate" title={item.name}>
              {item.name}
            </span>
            {item.favorite && item.trashedAt === null && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500 sm:hidden">
            {formatBytes(item.size)} · {formatDate(item.createdAt)}
            {item.kind === "video" && item.duration ? ` · ${formatDuration(item.duration)}` : ""}
          </p>
          <p className="mt-1 hidden text-xs uppercase tracking-wider text-zinc-600 sm:block">
            {getExtension(item.name)}
            {item.kind === "video" && item.duration ? ` · ${formatDuration(item.duration)}` : ""}
            {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
          </p>
        </div>
        <span className="hidden w-24 shrink-0 text-right text-sm tabular-nums text-zinc-400 sm:block">{formatBytes(item.size)}</span>
        <span className="hidden w-28 shrink-0 text-right text-sm text-zinc-500 md:block">{formatDate(item.createdAt)}</span>
      </button>

      <IconButton label="More actions" tooltip={false} aria-haspopup="menu" onClick={openMenuFromButton}>
        <Ellipsis className="size-5" />
      </IconButton>

      <Menu position={menu} items={items} onClose={() => setMenu(null)} title={item.name} />
    </div>
  );
}
