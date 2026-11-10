"use client";

import { useState } from "react";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { cn } from "@/lib/cn";
import type { MediaMeta } from "@/lib/types";
import { FileTypeIcon } from "./FileTypeIcon";

interface ThumbProps {
  item: MediaMeta;
  className?: string;
  imageClassName?: string;
  iconClassName?: string;
}

/** Thumbnail from the stored preview blob (object URL is revoked automatically). */
export function Thumb({ item, className, imageClassName, iconClassName }: ThumbProps) {
  const url = useObjectUrl(item.thumb);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const loaded = url !== null && loadedUrl === url;

  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-raised to-surface", className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        <FileTypeIcon item={item} className={cn("size-8 text-zinc-700", iconClassName)} />
      </div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoadedUrl(url)}
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
