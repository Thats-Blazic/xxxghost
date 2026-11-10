"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV, TAB_BAR } from "./nav";
import { useNavCounts } from "./NavLinks";

/** Native-style bottom tab bar for phones and tablets. */
export function MobileNav() {
  const pathname = usePathname();
  const counts = useNavCounts();
  const tabs = TAB_BAR.map((view) => NAV.find((entry) => entry.view === view)!);

  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {tabs.map(({ view, label, href, icon: Icon }) => {
          const active = pathname === href;
          const short = label === "All Files" ? "Files" : label;
          return (
            <li key={view}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none transition-colors",
                  active ? "text-violet-300" : "text-zinc-500 active:text-zinc-300",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-300",
                    active && "bg-violet-500/18",
                  )}
                >
                  <Icon className="size-[21px]" />
                  {view === "trash" && counts.trash > 0 && (
                    <span className="absolute right-1.5 top-0 size-2 rounded-full bg-violet-400" />
                  )}
                </span>
                {short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
