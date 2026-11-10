"use client";

import { CircleCheck, Film, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useUpload, type UploadEntry } from "@/components/providers/UploadProvider";
import { IconButton } from "@/components/ui/IconButton";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";

const STAGE_LABEL = {
  preparing: "Preparing…",
  processing: "Creating preview…",
  saving: "Saving to your vault…",
} as const;

function Preview({ entry }: { entry: UploadEntry }) {
  const url = useObjectUrl(entry.kind ? entry.file : null);
  const [failed, setFailed] = useState(false);
  const Fallback = entry.kind === "video" ? Film : ImageIcon;

  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-raised">
      <Fallback className="size-5 text-zinc-600" />
      {url && !failed && entry.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
        <img src={url} alt="" className="absolute inset-0 size-full object-cover" onError={() => setFailed(true)} />
      )}
      {url && !failed && entry.kind === "video" && (
        <video
          src={`${url}#t=0.5`}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function UploadRow({ entry }: { entry: UploadEntry }) {
  const { remove } = useUpload();
  const percent = Math.round(entry.progress * 100);
  const busy = entry.status === "uploading";

  return (
    <li
      className={cn(
        "flex animate-rise items-center gap-3 rounded-2xl border bg-raised/60 p-2.5 pr-3 transition-colors",
        entry.status === "invalid" || entry.status === "error" ? "border-red-500/25" : "border-line",
        entry.status === "done" && "border-emerald-500/20",
      )}
    >
      <Preview entry={entry} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{entry.file.name}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {formatBytes(entry.file.size)}
          {entry.status === "uploading" && entry.stage && <> · {STAGE_LABEL[entry.stage]}</>}
          {entry.status === "done" && <span className="text-emerald-400"> · Saved</span>}
          {(entry.status === "invalid" || entry.status === "error") && (
            <span className="text-red-400"> · {entry.error}</span>
          )}
        </p>
        {(busy || entry.status === "done") && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                entry.status === "done" ? "bg-emerald-400" : "bg-gradient-to-r from-violet-500 to-fuchsia-500",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex w-10 shrink-0 items-center justify-center">
        {busy && <Loader2 className="size-5 animate-spin text-violet-300" />}
        {entry.status === "done" && <CircleCheck className="size-5 text-emerald-400" />}
        {(entry.status === "ready" || entry.status === "invalid" || entry.status === "error") && (
          <IconButton label="Remove" className="size-9" onClick={() => remove(entry.id)} tooltip={false}>
            <X className="size-[18px]" />
          </IconButton>
        )}
      </div>
    </li>
  );
}
