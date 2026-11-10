import { Ghost } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="GHOST XXX home"
      className={cn("group inline-flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70", className)}
    >
      <span className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 via-violet-500 to-fuchsia-600 shadow-glow transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
        <Ghost className="size-5 text-white" strokeWidth={2.2} />
      </span>
      <span className="text-[17px] font-extrabold leading-none tracking-[0.14em] text-white">
        GHOST <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">XXX</span>
      </span>
    </Link>
  );
}
