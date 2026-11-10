"use client";

import { X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { formatBytes, formatDateTime, formatDuration } from "@/lib/format";
import { getExtension } from "@/lib/media";
import type { MediaMeta } from "@/lib/types";

export function InfoPanel({ item, onClose }: { item: MediaMeta; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Name", item.name],
    ["Type", `${item.kind === "image" ? "Image" : "Video"} · ${getExtension(item.name).toUpperCase()}`],
    ["MIME type", item.mime || "Unknown"],
    ["Size", `${formatBytes(item.size)} (${item.size.toLocaleString("en-US")} bytes)`],
  ];
  if (item.width && item.height) rows.push(["Dimensions", `${item.width} × ${item.height} px`]);
  if (item.kind === "video" && item.duration) rows.push(["Duration", formatDuration(item.duration)]);
  rows.push(["Uploaded", formatDateTime(item.createdAt)]);
  if (item.trashedAt !== null) rows.push(["Deleted", formatDateTime(item.trashedAt)]);
  else rows.push(["Favorite", item.favorite ? "Yes" : "No"]);

  return (
    <aside
      aria-label="File details"
      className="z-10 animate-slide-up border-white/10 bg-surface/95 backdrop-blur-xl max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 max-lg:max-h-[65%] max-lg:overflow-y-auto max-lg:rounded-t-3xl max-lg:border-t max-lg:pb-[env(safe-area-inset-bottom)] lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-l"
    >
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h3 className="text-base font-semibold">Details</h3>
        <IconButton label="Close details" tooltip={false} onClick={onClose} className="-mr-2">
          <X className="size-5" />
        </IconButton>
      </div>
      <dl className="space-y-4 px-5 pb-6 pt-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wider text-zinc-500">{label}</dt>
            <dd className="mt-1 break-words text-sm text-zinc-100">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
