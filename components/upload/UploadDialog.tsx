"use client";

import { CloudUpload, FolderOpen } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { useUpload } from "@/components/providers/UploadProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { formatBytes, pluralize } from "@/lib/format";
import { FILE_INPUT_ACCEPT, SUPPORTED_LABEL } from "@/lib/media";
import { UploadRow } from "./UploadRow";

export function UploadDialog() {
  const { entries, open, setOpen, addFiles, clearFinished, start, uploading } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const ready = entries.filter((entry) => entry.status === "ready");
  const finished = entries.filter((entry) => entry.status === "done" || entry.status === "invalid" || entry.status === "error");
  const readySize = ready.reduce((sum, entry) => sum + entry.file.size, 0);

  function close() {
    setOpen(false);
    if (!uploading) clearFinished();
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title="Upload files"
      description="Add photos and videos. Everything is stored privately in this browser."
      footer={
        <>
          <div className="mr-auto hidden text-sm text-zinc-500 sm:block">
            {ready.length > 0
              ? `${pluralize(ready.length, "file")} · ${formatBytes(readySize)}`
              : uploading
                ? "Uploading… you can close this window"
                : entries.length > 0
                  ? "All done"
                  : ""}
          </div>
          <Button variant="ghost" onClick={close}>
            {uploading ? "Hide" : finished.length > 0 && ready.length === 0 ? "Done" : "Cancel"}
          </Button>
          <Button variant="primary" disabled={ready.length === 0} onClick={() => void start()}>
            {ready.length > 0 ? `Upload ${pluralize(ready.length, "file")}` : "Upload"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div
          data-dropzone
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={onDrop}
          className={cn(
            "relative overflow-hidden rounded-2xl border-2 border-dashed px-5 text-center transition-all duration-300",
            entries.length === 0 ? "py-12" : "py-6",
            dragging
              ? "scale-[1.01] border-violet-400 bg-violet-500/10 shadow-glow"
              : "border-line bg-raised/50 hover:border-violet-400/40",
          )}
        >
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-1/2 top-0 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/15 blur-3xl transition-opacity",
              dragging ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            className={cn(
              "relative mx-auto flex items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10 transition-transform duration-300",
              entries.length === 0 ? "size-16" : "size-12",
              dragging && "-translate-y-1 scale-110",
            )}
          >
            <CloudUpload className={cn("text-violet-300", entries.length === 0 ? "size-8" : "size-6")} />
          </div>
          <p className="relative mt-4 text-base font-medium text-white">
            {dragging ? "Drop to add" : "Drag & drop files here"}
          </p>
          <p className="relative mt-1 text-sm text-zinc-500">or choose them from your device</p>
          <div className="relative mt-4 flex justify-center">
            <Button variant="secondary" icon={<FolderOpen className="size-4" />} onClick={() => inputRef.current?.click()}>
              Browse files
            </Button>
          </div>
          <p className="relative mt-4 text-xs leading-relaxed text-zinc-600">
            {SUPPORTED_LABEL}
            <br />
            No file size limit, only your free browser space
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={FILE_INPUT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              if (event.target.files?.length) addFiles(Array.from(event.target.files));
              // Allow picking the same file again later.
              event.target.value = "";
            }}
          />
        </div>

        {entries.length > 0 && (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <UploadRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
