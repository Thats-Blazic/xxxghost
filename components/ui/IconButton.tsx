import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Tooltip } from "./Tooltip";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  children: ReactNode;
  active?: boolean;
  tone?: "default" | "onMedia";
  tooltipSide?: "top" | "bottom";
  tooltip?: boolean;
  /** Classes for the tooltip wrapper (use for positioning). Ignored when `tooltip` is false. */
  wrapperClassName?: string;
}

export function IconButton({
  label,
  children,
  active,
  tone = "default",
  tooltipSide = "bottom",
  tooltip = true,
  wrapperClassName,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex size-10 shrink-0 select-none items-center justify-center rounded-xl outline-none transition duration-200",
        "focus-visible:ring-2 focus-visible:ring-violet-400/70 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
        tone === "default" &&
          (active
            ? "bg-violet-500/15 text-violet-300 hover:bg-violet-500/25"
            : "text-zinc-300 hover:bg-white/8 hover:text-white"),
        tone === "onMedia" &&
          (active
            ? "bg-violet-500/30 text-violet-200 backdrop-blur-md hover:bg-violet-500/40"
            : "bg-black/45 text-white backdrop-blur-md hover:bg-black/65"),
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
  return tooltip ? (
    <Tooltip label={label} side={tooltipSide} className={wrapperClassName}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}
