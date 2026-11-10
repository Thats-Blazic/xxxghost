"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { cn } from "@/lib/cn";
import type { ViewKey } from "@/lib/types";
import { NAV } from "./nav";

/** Number of files that belong to each sidebar section. */
export function useNavCounts(): Record<ViewKey, number> {
  const { items } = useLibrary();
  return {
    all: items.filter((i) => i.trashedAt === null).length,
    images: items.filter((i) => i.trashedAt === null && i.kind === "image").length,
    videos: items.filter((i) => i.trashedAt === null && i.kind === "video").length,
    recent: Math.min(30, items.filter((i) => i.trashedAt === null).length),
    favorites: items.filter((i) => i.trashedAt === null && i.favorite).length,
    trash: items.filter((i) => i.trashedAt !== null).length,
  };
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const counts = useNavCounts();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ view, label, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={view}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition-colors duration-200",
              "focus-visible:ring-2 focus-visible:ring-violet-400/60",
              active ? "bg-violet-500/12 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
          >
            {active && (
              <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-violet-400 shadow-[0_0_12px_2px_rgb(167_139_250/0.7)]" />
            )}
            <Icon
              className={cn(
                "size-[18px] transition-colors",
                active ? "text-violet-300" : "text-zinc-500 group-hover:text-zinc-300",
              )}
            />
            <span className="flex-1 truncate">{label}</span>
            {counts[view] > 0 && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  active ? "bg-violet-500/25 text-violet-200" : "bg-white/6 text-zinc-500",
                )}
              >
                {counts[view]}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
