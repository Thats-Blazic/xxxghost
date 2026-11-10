"use client";

import { Download, RotateCcw, Star, StarOff, Trash2, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { useFileActions } from "@/components/providers/FileActionsProvider";
import type { MediaMeta } from "@/lib/types";

interface SelectionBarProps {
  selected: MediaMeta[];
  total: number;
  inTrash: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onDone: () => void;
}

/** Floating action bar shown while selecting multiple files. */
export function SelectionBar({ selected, total, inTrash, onSelectAll, onClear, onDone }: SelectionBarProps) {
  const actions = useFileActions();
  const count = selected.length;
  const allSelected = count === total;
  const allFavorite = count > 0 && selected.every((item) => item.favorite);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:bottom-6 lg:left-64">
      <div className="pointer-events-auto flex w-full max-w-xl animate-slide-up items-center gap-1 rounded-2xl border border-white/10 bg-overlay/95 p-2 pl-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="mr-auto min-w-0">
          <p className="text-sm font-semibold tabular-nums">{count} selected</p>
          <button
            type="button"
            onClick={allSelected ? onClear : onSelectAll}
            className="text-xs text-violet-300 hover:text-violet-200 hover:underline"
          >
            {allSelected ? "Deselect all" : `Select all ${total}`}
          </button>
        </div>

        {inTrash ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={count === 0}
              icon={<RotateCcw className="size-4" />}
              onClick={() => void actions.restore(selected).then((ok) => ok && onDone())}
            >
              Restore
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={count === 0}
              icon={<Trash2 className="size-4" />}
              onClick={() => void actions.purge(selected).then((ok) => ok && onDone())}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            <IconButton label="Download" tooltipSide="top" disabled={count === 0} onClick={() => void actions.download(selected)}>
              <Download className="size-5" />
            </IconButton>
            <IconButton
              label={allFavorite ? "Remove from Favorites" : "Add to Favorites"}
              tooltipSide="top"
              disabled={count === 0}
              onClick={() => void actions.toggleFavorite(selected)}
            >
              {allFavorite ? <StarOff className="size-5" /> : <Star className="size-5" />}
            </IconButton>
            <IconButton
              label="Delete"
              tooltipSide="top"
              disabled={count === 0}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={() => void actions.trash(selected).then((ok) => ok && onDone())}
            >
              <Trash2 className="size-5" />
            </IconButton>
          </>
        )}
        <IconButton label="Cancel selection" tooltipSide="top" onClick={onDone}>
          <X className="size-5" />
        </IconButton>
      </div>
    </div>
  );
}
