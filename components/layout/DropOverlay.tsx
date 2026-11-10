"use client";

import { CloudUpload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUpload } from "@/components/providers/UploadProvider";

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

/** Lets users drop files anywhere on the page to start an upload. */
export function DropOverlay() {
  const { addFiles } = useUpload();
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current += 1;
      setActive(true);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setActive(false);
      // The upload dialog's own drop zone handles its drops.
      if ((event.target as HTMLElement | null)?.closest?.("[data-dropzone]")) return;
      if (event.dataTransfer?.files.length) addFiles(Array.from(event.dataTransfer.files));
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] flex animate-fade-in items-center justify-center bg-ink/80 p-6 backdrop-blur-md">
      <div className="flex w-full max-w-xl flex-col items-center rounded-[2rem] border-2 border-dashed border-violet-400/60 bg-violet-500/8 px-8 py-16 text-center shadow-glow">
        <CloudUpload className="size-14 text-violet-300" />
        <p className="mt-5 text-2xl font-semibold tracking-tight">Drop to upload</p>
        <p className="mt-2 text-sm text-zinc-400">Release your images and videos anywhere to add them to GHOST XXX.</p>
      </div>
    </div>
  );
}
