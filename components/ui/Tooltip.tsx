import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/** CSS-only tooltip: hover on pointer devices, focus-visible for keyboard users, hidden on touch. */
export function Tooltip({ label, children, side = "bottom", className }: TooltipProps) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-overlay px-2 py-1 text-xs font-medium text-zinc-100 opacity-0 shadow-lg transition-opacity duration-150",
          "can-hover:group-hover/tt:opacity-100 group-has-[:focus-visible]/tt:opacity-100",
          side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
        )}
      >
        {label}
      </span>
    </span>
  );
}
