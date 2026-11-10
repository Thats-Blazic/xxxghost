"use client";

import { CheckSquare, Download, Eye, Pencil, RotateCcw, Star, StarOff, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useFileActions } from "@/components/providers/FileActionsProvider";
import type { MenuItem } from "@/components/ui/Menu";
import type { MediaMeta } from "@/lib/types";

interface Options {
  onPreview?: () => void;
  onSelect?: () => void;
  /** Called after an action that removes the file from the current view. */
  onRemoved?: () => void;
}

/** Builds the dropdown / context-menu entries for a single file. */
export function useFileMenu(item: MediaMeta, { onPreview, onSelect, onRemoved }: Options = {}): MenuItem[] {
  const actions = useFileActions();

  return useMemo(() => {
    const entries: MenuItem[] = [];
    if (onPreview) entries.push({ id: "preview", label: "Preview", icon: Eye, onSelect: onPreview });
    entries.push({ id: "download", label: "Download", icon: Download, onSelect: () => void actions.download([item]) });

    if (item.trashedAt !== null) {
      entries.push({
        id: "restore",
        label: "Restore",
        icon: RotateCcw,
        onSelect: () => void actions.restore([item]).then((ok) => ok && onRemoved?.()),
      });
      entries.push({
        id: "purge",
        label: "Delete permanently",
        icon: Trash2,
        danger: true,
        separated: true,
        onSelect: () => void actions.purge([item]).then((ok) => ok && onRemoved?.()),
      });
      return entries;
    }

    entries.push({ id: "rename", label: "Rename", icon: Pencil, onSelect: () => actions.rename(item) });
    entries.push({
      id: "favorite",
      label: item.favorite ? "Remove from Favorites" : "Add to Favorites",
      icon: item.favorite ? StarOff : Star,
      onSelect: () => void actions.toggleFavorite([item]),
    });
    if (onSelect) entries.push({ id: "select", label: "Select", icon: CheckSquare, onSelect });
    entries.push({
      id: "delete",
      label: "Delete",
      icon: Trash2,
      danger: true,
      separated: true,
      onSelect: () => void actions.trash([item]).then((ok) => ok && onRemoved?.()),
    });
    return entries;
  }, [actions, item, onPreview, onSelect, onRemoved]);
}
