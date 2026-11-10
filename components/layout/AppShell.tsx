import type { ReactNode } from "react";
import { UploadDialog } from "@/components/upload/UploadDialog";
import { Drawer } from "./Drawer";
import { DropOverlay } from "./DropOverlay";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { VaultGate } from "./VaultGate";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh lg:pl-64">
      {/* Ambient violet glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/2 size-[620px] -translate-x-1/3 rounded-full bg-violet-700/12 blur-[140px]" />
        <div className="absolute -bottom-64 right-0 size-[520px] rounded-full bg-fuchsia-700/8 blur-[140px]" />
      </div>

      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <Header />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>
      <MobileNav />
      <Drawer />
      <UploadDialog />
      <DropOverlay />
      <VaultGate />
    </div>
  );
}
