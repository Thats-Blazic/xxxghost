"use client";

import { Ellipsis, Play, Star } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, type MenuPosition } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import type { MediaMeta } from "@/lib/types";
import { SelectCheck } from "./SelectCheck";
import { Thumb } from "./Thumb";
import { useFileMenu } from "./useFileMenu";

export interface ItemViewProps {
  item: MediaMeta;
  selected: boolean;
  selecting: boolean;
  selectable?: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onRemoved?: () => void;
}

export function MediaCard({ item, selected, selecting, selectable = true, onOpen, onToggleSelect, onRemoved }: ItemViewProps) {
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const items = useFileMenu(item, { onPreview: onOpen, onSelect: selectable ? onToggleSelect : undefined, onRemoved });

  function openMenuFromButton(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({ x: rect.right, y: rect.bottom, alignRight: true });
  }

  // Overlay controls: always visible on touch, revealed on hover for mouse users.
  const reveal = "can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100";

  return (
    <div
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY });
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-surface transition duration-300",
        "can-hover:hover:-translate-y-0.5 can-hover:hover:border-violet-400/40 can-hover:hover:shadow-[0_12px_40px_-12px_rgb(139_92_246/0.45)]",
        selected ? "border-violet-400 ring-2 ring-violet-400/60" : "border-line",
      )}
    >
      <button
        type="button"
        onClick={() => (selecting && selectable ? onToggleSelect() : onOpen())}
        aria-label={`${selecting ? "Select" : "Open"} ${item.name}`}
        className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
      >
        <div className="relative">
          <Thumb
            item={item}
            className="aspect-[4/3] w-full"
            imageClassName={cn("transition-transform duration-500 can-hover:group-hover:scale-105", selected && "scale-95")}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 opacity-70 transition-opacity can-hover:group-hover:opacity-100" />

          {item.favorite && item.trashedAt === null && (
            <span
              aria-label="Favorite"
              className="pointer-events-none absolute bottom-2 left-2 flex size-6 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm"
            >
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
            </span>
          )}

          {item.kind === "video" && (
            <>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex size-12 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md transition duration-300 can-hover:group-hover:scale-110 can-hover:group-hover:bg-violet-500/80">
                  <Play className="ml-0.5 size-5 fill-current" />
                </span>
              </span>
              {item.duration ? (
                <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">
                  {formatDuration(item.duration)}
                </span>
              ) : null}
            </>
          )}
        </div>

        <div className="px-3.5 pb-3.5 pt-3">
          <p className="truncate text-sm font-medium text-white" title={item.name}>
            {item.name}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {formatBytes(item.size)} · {formatDate(item.createdAt)}
          </p>
        </div>
      </button>

      {selectable && (
        <SelectCheck
          checked={selected}
          onChange={onToggleSelect}
          label={`Select ${item.name}`}
          className={cn("absolute left-2.5 top-2.5", !selecting && !selected && reveal)}
        />
      )}

      <IconButton
        label="More actions"
        tone="onMedia"
        tooltip={false}
        onClick={openMenuFromButton}
        aria-haspopup="menu"
        className={cn("absolute right-2 top-2 size-9", reveal)}
      >
        <Ellipsis className="size-5" />
      </IconButton>

      <Menu position={menu} items={items} onClose={() => setMenu(null)} title={item.name} />
    </div>
  );
}
