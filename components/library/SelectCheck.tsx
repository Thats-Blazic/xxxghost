import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface SelectCheckProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}

export function SelectCheck({ checked, onChange, label, className }: SelectCheckProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className={cn(
        "flex size-7 items-center justify-center rounded-full border-2 outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-violet-400",
        checked
          ? "scale-100 border-violet-400 bg-violet-500 text-white shadow-[0_0_14px_rgb(139_92_246/0.7)]"
          : "border-white/70 bg-black/40 text-transparent backdrop-blur-sm hover:border-white hover:bg-black/60",
        className,
      )}
    >
      <Check className="size-4" strokeWidth={3} />
    </button>
  );
}
