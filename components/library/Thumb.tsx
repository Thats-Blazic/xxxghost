"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { MediaMeta } from "@/lib/types";
import { FileTypeIcon } from "./FileTypeIcon";

interface ThumbProps {
  item: MediaMeta;
  className?: string;
  imageClassName?: string;
  iconClassName?: string;
}

/** Thumbnail served from cloud storage; the file-type icon shows until it has loaded. */
export function Thumb({ item, className, imageClassName, iconClassName }: ThumbProps) {
  const url = item.thumbUrl ?? null;
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const loaded = url !== null && loadedUrl === url;

  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-raised to-surface", className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        <FileTypeIcon item={item} className={cn("size-8 text-zinc-700", iconClassName)} />
      </div>
      {url && failedUrl !== url && (
        // eslint-disable-next-line @next/next/no-img-element -- remote user media from cloud storage
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoadedUrl(url)}
          onError={() => setFailedUrl(url)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
        />
      )}
    </div>
  );
}
