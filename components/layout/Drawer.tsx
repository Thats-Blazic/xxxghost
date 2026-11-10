"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useUI } from "@/components/providers/UIProvider";
import { IconButton } from "@/components/ui/IconButton";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { SidebarStorage } from "./SidebarStorage";

/** Slide-in navigation for phones and tablets. */
export function Drawer() {
  const { drawerOpen, setDrawerOpen } = useUI();
  useLockBodyScroll(drawerOpen);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setDrawerOpen(false);
    const onResize = () => window.innerWidth >= 1024 && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] animate-drawer-in flex-col gap-6 border-r border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]"
      >
        <div className="flex items-center justify-between">
          <Logo />
          <IconButton label="Close menu" tooltip={false} onClick={() => setDrawerOpen(false)}>
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks onNavigate={() => setDrawerOpen(false)} />
        </div>
        <SidebarStorage />
      </aside>
    </div>,
    document.body,
  );
}
