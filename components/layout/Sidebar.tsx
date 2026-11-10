"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUpload } from "@/components/providers/UploadProvider";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { SidebarStorage } from "./SidebarStorage";

export function Sidebar() {
  const { setOpen } = useUpload();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-line bg-ink/80 p-5 backdrop-blur-xl lg:flex">
      <Logo className="px-1 pt-1" />
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        icon={<Upload className="size-[18px]" />}
        onClick={() => setOpen(true)}
      >
        Upload files
      </Button>
      <div className="no-scrollbar -mx-1 flex-1 overflow-y-auto px-1">
        <NavLinks />
      </div>
      <SidebarStorage />
    </aside>
  );
}
