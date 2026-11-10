"use client";

import { ChevronLeft, ChevronRight, Download, Ellipsis, Info, Loader2, Star, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useFileActions } from "@/components/providers/FileActionsProvider";
import { useLibrary } from "@/components/providers/LibraryProvider";
import { useFileMenu } from "@/components/library/useFileMenu";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, type MenuPosition } from "@/components/ui/Menu";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useMediaBlob } from "@/hooks/useMediaBlob";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { cn } from "@/lib/cn";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import { playbackBlob } from "@/lib/media";
import type { MediaMeta } from "@/lib/types";
import { ImageViewer } from "./ImageViewer";
import { InfoPanel } from "./InfoPanel";
import { VideoPlayer } from "./VideoPlayer";

interface PreviewModalProps {
  /** Ordered ids that Previous / Next move through. */
  ids: string[];
  currentId: string;
  onNavigate: (id: string) => void;
  onClose: () => void;
  /** The file left the current list (deleted / restored). */
  onRemoved: (id: string) => void;
}

export function PreviewModal(props: PreviewModalProps) {
  const { items } = useLibrary();
  const { currentId, onClose } = props;
  const item = useMemo(() => items.find((candidate) => candidate.id === currentId), [items, currentId]);

  useEffect(() => {
    if (!item) onClose();
  }, [item, onClose]);

  if (!item || typeof document === "undefined") return null;
  return createPortal(<PreviewContent {...props} item={item} />, document.body);
}

function PreviewContent({ item, ids, onNavigate, onClose, onRemoved }: PreviewModalProps & { item: MediaMeta }) {
  const actions = useFileActions();
  const [infoOpen, setInfoOpen] = useState(false);
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  useLockBodyScroll(true);

  const index = ids.indexOf(item.id);
  const prevId = index > 0 ? ids[index - 1] : null;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;

  const blobResult = useMediaBlob(item.id);
  const playable = useMemo(() => {
    if (!blobResult?.blob) return null;
    return item.kind === "video" ? playbackBlob(blobResult.blob, item.name) : blobResult.blob;
  }, [blobResult, item.kind, item.name]);
  const url = useObjectUrl(playable);
  const posterUrl = useObjectUrl(item.kind === "video" ? item.thumb : null);

  const removed = useCallback(() => onRemoved(item.id), [onRemoved, item.id]);
  const menuItems = useFileMenu(item, { onRemoved: removed });
  const go = useCallback(
    (direction: -1 | 1) => {
      const target = direction < 0 ? prevId : nextId;
      if (target) onNavigate(target);
    },
    [prevId, nextId, onNavigate],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      // Another dialog / menu is above the preview: leave keys to it.
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-preview]), [role="menu"]')) return;

      if (event.key === "Escape") onClose();
      else if (event.key === "n" || event.key === "N") go(1);
      else if (event.key === "p" || event.key === "P") go(-1);
      else if (item.kind === "image" && event.key === "ArrowRight") go(1);
      else if (item.kind === "image" && event.key === "ArrowLeft") go(-1);
      else if (event.key.toLowerCase() === "i") setInfoOpen((open) => !open);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, item.kind]);

  const ratio = item.width && item.height ? item.width / item.height : 16 / 9;
  const inTrash = item.trashedAt !== null;
  const meta = [
    formatBytes(item.size),
    item.kind === "video" && item.duration ? formatDuration(item.duration) : null,
    item.width && item.height ? `${item.width}×${item.height}` : null,
    formatDate(item.createdAt),
  ].filter(Boolean);

  let stage: React.ReactNode;
  if (!blobResult || (blobResult.blob && !url)) {
    stage = <Loader2 className="size-10 animate-spin text-violet-300" />;
  } else if (!blobResult.blob || !url) {
    stage = (
      <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
        <TriangleAlert className="size-10 text-amber-400" />
        <p className="font-medium">This file could not be loaded</p>
        <p className="text-sm text-zinc-400">It may have been removed from this browser&apos;s storage.</p>
      </div>
    );
  } else if (item.kind === "image") {
    stage = <ImageViewer key={item.id} src={url} alt={item.name} onSwipe={go} />;
  } else {
    stage = (
      <VideoPlayer
        key={item.id}
        src={url}
        poster={posterUrl}
        title={item.name}
        aspectRatio={ratio}
        onDownload={() => void actions.download([item])}
      />
    );
  }

  return (
    <div
      data-preview
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${item.name}`}
      className="fixed inset-0 z-[70] flex animate-fade-in flex-col bg-black/95 backdrop-blur-2xl"
    >
      <header className="z-20 flex shrink-0 items-center gap-1.5 border-b border-white/8 bg-black/50 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl sm:gap-2 sm:px-4">
        <IconButton label="Close" onClick={onClose}>
          <X className="size-5" />
        </IconButton>
        <div className="min-w-0 flex-1 px-1">
          <h2 className="truncate text-sm font-semibold sm:text-base" title={item.name}>
            {item.name}
          </h2>
          <p className="truncate text-xs text-zinc-400">
            {ids.length > 1 && index >= 0 && <span className="text-violet-300">{index + 1} / {ids.length} · </span>}
            {meta.join(" · ")}
          </p>
        </div>

        {!inTrash && (
          <IconButton
            label={item.favorite ? "Remove from Favorites" : "Add to Favorites"}
            active={item.favorite}
            onClick={() => void actions.toggleFavorite([item])}
          >
            <Star className={cn("size-5", item.favorite && "fill-amber-400 text-amber-400")} />
          </IconButton>
        )}
        <IconButton label="Details" active={infoOpen} onClick={() => setInfoOpen((open) => !open)}>
          <Info className="size-5" />
        </IconButton>
        <IconButton label="Download" className="sm:hidden" tooltip={false} onClick={() => void actions.download([item])}>
          <Download className="size-5" />
        </IconButton>
        <Button
          variant="primary"
          size="sm"
          className="max-sm:hidden"
          icon={<Download className="size-4" />}
          onClick={() => void actions.download([item])}
        >
          Download
        </Button>
        <IconButton
          label="More actions"
          aria-haspopup="menu"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setMenu({ x: rect.right, y: rect.bottom, alignRight: true });
          }}
        >
          <Ellipsis className="size-5" />
        </IconButton>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-1 items-center justify-center sm:p-4">
          {stage}

          {prevId && (
            <IconButton
              label="Previous"
              tone="onMedia"
              onClick={() => go(-1)}
              wrapperClassName="!absolute left-2 top-1/2 z-10 -translate-y-1/2 sm:left-4"
              className="size-11 rounded-full max-sm:size-9 max-sm:opacity-80"
            >
              <ChevronLeft className="size-6" />
            </IconButton>
          )}
          {nextId && (
            <IconButton
              label="Next"
              tone="onMedia"
              onClick={() => go(1)}
              wrapperClassName="!absolute right-2 top-1/2 z-10 -translate-y-1/2 sm:right-4"
              className="size-11 rounded-full max-sm:size-9 max-sm:opacity-80"
            >
              <ChevronRight className="size-6" />
            </IconButton>
          )}
        </div>

        {infoOpen && <InfoPanel item={item} onClose={() => setInfoOpen(false)} />}
      </div>

      <Menu position={menu} items={menuItems} onClose={() => setMenu(null)} title={item.name} />
    </div>
  );
}
