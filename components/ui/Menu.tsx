"use client";

import { useEffect, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface MenuItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  /** Draw a divider above this item. */
  separated?: boolean;
}

export interface MenuPosition {
  /** Viewport coordinates. For dropdowns pass the anchor's bottom-right corner. */
  x: number;
  y: number;
  /** Align the menu's right edge with x (dropdown) instead of its left edge (context menu). */
  alignRight?: boolean;
}

const MENU_WIDTH = 224;
const ITEM_HEIGHT = 40;

interface MenuProps {
  position: MenuPosition | null;
  items: MenuItem[];
  onClose: () => void;
  title?: string;
}

/** Dropdown / context menu on pointer devices, bottom sheet on phones. */
export function Menu({ position, items, onClose, title }: MenuProps) {
  useEffect(() => {
    if (!position) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onClose);
    };
  }, [position, onClose]);

  if (!position || typeof document === "undefined") return null;

  const isPhone = window.innerWidth < 640;
  const height = items.length * ITEM_HEIGHT + 16;
  let left = position.alignRight ? position.x - MENU_WIDTH : position.x;
  left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8));
  let top = position.y + 6;
  if (top + height > window.innerHeight - 8) top = Math.max(8, position.y - height - 6);

  const list = items.map((item) => {
    const Icon = item.icon;
    return (
      <div key={item.id}>
        {item.separated && <div className="my-1 h-px bg-line" />}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={cn(
            "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm outline-none transition-colors sm:h-10",
            item.danger
              ? "text-red-400 hover:bg-red-500/10 focus-visible:bg-red-500/10"
              : "text-zinc-200 hover:bg-white/8 focus-visible:bg-white/8",
          )}
        >
          {Icon && <Icon className="size-4 shrink-0 opacity-80" />}
          <span className="truncate">{item.label}</span>
        </button>
      </div>
    );
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[90]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          onClose();
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {isPhone && <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]" />}
      {isPhone ? (
        <div
          role="menu"
          className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-3xl border-t border-line bg-surface p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
        >
          <div className="mx-auto mb-2 mt-1 h-1 w-10 rounded-full bg-white/15" />
          {title && <p className="truncate px-3 pb-2 text-sm font-medium text-zinc-400">{title}</p>}
          {list}
        </div>
      ) : (
        <div
          role="menu"
          style={{ left, top, width: MENU_WIDTH }}
          className="absolute animate-scale-in rounded-xl border border-line bg-overlay p-1.5 shadow-2xl shadow-black/60 [transform-origin:top_right]"
        >
          {list}
        </div>
      )}
    </div>,
    document.body,
  );
}
