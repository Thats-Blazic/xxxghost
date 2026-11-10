"use client";

import { LayoutGrid, List, Menu, Search, Upload, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useUI } from "@/components/providers/UIProvider";
import { useUpload } from "@/components/providers/UploadProvider";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

export function Header() {
  const { query, setQuery, layout, setLayout, setDrawerOpen } = useUI();
  const { setOpen, uploading } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" or Ctrl/Cmd+K focuses the search box.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.key === "/" && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
        <IconButton label="Open menu" className="lg:hidden" tooltip={false} onClick={() => setDrawerOpen(true)}>
          <Menu className="size-5" />
        </IconButton>
        <Logo className="lg:hidden" />

        <div className="order-last flex w-full items-center gap-2 lg:order-none lg:w-auto lg:flex-1">
          <label className="group relative block min-w-0 flex-1 lg:max-w-xl">
            <span className="sr-only">Search files</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-violet-300" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files"
              autoComplete="off"
              enterKeyHint="search"
              className="h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-20 text-[15px] text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-400/60 focus:bg-raised focus:ring-4 focus:ring-violet-500/10 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-raised px-1.5 py-0.5 font-mono text-[11px] text-zinc-500 lg:block">
                /
              </kbd>
            )}
          </label>

          <div className="flex shrink-0 rounded-xl border border-line bg-surface p-1" role="group" aria-label="Layout">
            {(
              [
                ["grid", LayoutGrid, "Grid view"],
                ["list", List, "List view"],
              ] as const
            ).map(([mode, Icon, label]) => (
              <IconButton
                key={mode}
                label={label}
                active={layout === mode}
                onClick={() => setLayout(mode)}
                className={cn("size-9 rounded-lg", layout === mode && "bg-violet-500/20")}
              >
                <Icon className="size-[18px]" />
              </IconButton>
            ))}
          </div>
        </div>

        <div className="ml-auto lg:ml-0">
          <Button
            variant="primary"
            className="relative max-lg:size-11 max-lg:px-0 lg:hidden"
            aria-label="Upload files"
            onClick={() => setOpen(true)}
          >
            <Upload className="size-[18px]" />
            {uploading && <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full border-2 border-ink bg-emerald-400" />}
          </Button>
          <Button
            variant="primary"
            className="relative max-lg:hidden"
            icon={<Upload className="size-[18px]" />}
            onClick={() => setOpen(true)}
          >
            Upload
            {uploading && <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full border-2 border-ink bg-emerald-400" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
