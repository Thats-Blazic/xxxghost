"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { startDownload, wait } from "@/lib/download";
import { pluralize } from "@/lib/format";
import { sanitizeFileName, splitName } from "@/lib/media";
import type { MediaMeta } from "@/lib/types";
import { useConfirm } from "./ConfirmProvider";
import { useLibrary } from "./LibraryProvider";
import { useToast } from "./ToastProvider";

interface FileActions {
  download: (items: MediaMeta[]) => Promise<void>;
  rename: (item: MediaMeta) => void;
  toggleFavorite: (items: MediaMeta[]) => Promise<void>;
  trash: (items: MediaMeta[]) => Promise<boolean>;
  restore: (items: MediaMeta[]) => Promise<boolean>;
  purge: (items: MediaMeta[]) => Promise<boolean>;
  emptyTrash: () => Promise<boolean>;
}

const FileActionsContext = createContext<FileActions | null>(null);

function describe(items: MediaMeta[]): string {
  return items.length === 1 ? `"${items[0].name}"` : pluralize(items.length, "file");
}

export function FileActionsProvider({ children }: { children: ReactNode }) {
  const library = useLibrary();
  const toast = useToast();
  const confirm = useConfirm();
  const [renaming, setRenaming] = useState<MediaMeta | null>(null);

  const { setFavorite, moveToTrash, restore, deletePermanently } = library;
  const trashedItems = useMemo(() => library.items.filter((item) => item.trashedAt !== null), [library.items]);

  const download = useCallback(
    async (items: MediaMeta[]) => {
      try {
        for (let i = 0; i < items.length; i += 1) {
          startDownload(items[i].downloadUrl, items[i].name);
          // Browsers throttle rapid multi-downloads; a small gap keeps them all.
          if (i < items.length - 1) await wait(350);
        }
        toast({
          type: "success",
          title: items.length === 1 ? "Download started" : `Downloading ${pluralize(items.length, "file")}`,
          description: items.length === 1 ? items[0].name : undefined,
        });
      } catch (error) {
        toast({
          type: "error",
          title: "Download failed",
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [toast],
  );

  const toggleFavorite = useCallback(
    async (items: MediaMeta[]) => {
      if (items.length === 0) return;
      // If every item is already a favorite, this action removes them.
      const next = !items.every((item) => item.favorite);
      try {
        await setFavorite(
          items.map((item) => item.id),
          next,
        );
        toast({
          type: "success",
          title: next ? "Added to Favorites" : "Removed from Favorites",
          description: items.length === 1 ? items[0].name : pluralize(items.length, "file"),
        });
      } catch {
        toast({ type: "error", title: "Couldn't update Favorites" });
      }
    },
    [setFavorite, toast],
  );

  const trash = useCallback(
    async (items: MediaMeta[]) => {
      if (items.length === 0) return false;
      const ok = await confirm({
        title: `Delete ${describe(items)}?`,
        description: "It will be moved to Trash. You can restore it from there at any time.",
        confirmLabel: "Move to Trash",
        tone: "danger",
      });
      if (!ok) return false;
      try {
        await moveToTrash(items.map((item) => item.id));
        toast({ type: "success", title: "Moved to Trash", description: describe(items) });
        return true;
      } catch {
        toast({ type: "error", title: "Couldn't delete the file" });
        return false;
      }
    },
    [confirm, moveToTrash, toast],
  );

  const restoreItems = useCallback(
    async (items: MediaMeta[]) => {
      if (items.length === 0) return false;
      try {
        await restore(items.map((item) => item.id));
        toast({ type: "success", title: "Restored", description: describe(items) });
        return true;
      } catch {
        toast({ type: "error", title: "Couldn't restore the file" });
        return false;
      }
    },
    [restore, toast],
  );

  const purge = useCallback(
    async (items: MediaMeta[]) => {
      if (items.length === 0) return false;
      const ok = await confirm({
        title: `Delete ${describe(items)} forever?`,
        description: "This can't be undone. The file will be erased from cloud storage.",
        confirmLabel: "Delete forever",
        tone: "danger",
      });
      if (!ok) return false;
      try {
        await deletePermanently(items.map((item) => item.id));
        toast({ type: "success", title: "Deleted permanently", description: describe(items) });
        return true;
      } catch {
        toast({ type: "error", title: "Couldn't delete the file" });
        return false;
      }
    },
    [confirm, deletePermanently, toast],
  );

  const emptyTrash = useCallback(async () => {
    if (trashedItems.length === 0) return false;
    const ok = await confirm({
      title: "Empty Trash?",
      description: `${pluralize(trashedItems.length, "file")} will be permanently deleted. This can't be undone.`,
      confirmLabel: "Empty Trash",
      tone: "danger",
    });
    if (!ok) return false;
    try {
      await deletePermanently(trashedItems.map((item) => item.id));
      toast({ type: "success", title: "Trash emptied" });
      return true;
    } catch {
      toast({ type: "error", title: "Couldn't empty Trash" });
      return false;
    }
  }, [confirm, deletePermanently, toast, trashedItems]);

  const value = useMemo<FileActions>(
    () => ({
      download,
      rename: setRenaming,
      toggleFavorite,
      trash,
      restore: restoreItems,
      purge,
      emptyTrash,
    }),
    [download, toggleFavorite, trash, restoreItems, purge, emptyTrash],
  );

  return (
    <FileActionsContext.Provider value={value}>
      {children}
      <RenameDialog item={renaming} onClose={() => setRenaming(null)} />
    </FileActionsContext.Provider>
  );
}

function RenameDialog({ item, onClose }: { item: MediaMeta | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onClose={onClose} title="Rename file" size="sm">
      {/* Keyed form so the input always starts from the current name. */}
      {item && <RenameForm key={item.id} item={item} onClose={onClose} />}
    </Dialog>
  );
}

function RenameForm({ item, onClose }: { item: MediaMeta; onClose: () => void }) {
  const { rename } = useLibrary();
  const toast = useToast();
  const { base, ext } = splitName(item.name);
  const [value, setValue] = useState(base);
  const [busy, setBusy] = useState(false);

  const cleaned = sanitizeFileName(value);
  const unchanged = cleaned + ext === item.name;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!cleaned || unchanged) return;
    setBusy(true);
    try {
      await rename(item.id, cleaned + ext);
      toast({ type: "success", title: "File renamed", description: cleaned + ext });
      onClose();
    } catch {
      toast({ type: "error", title: "Couldn't rename the file" });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="-mx-1 space-y-5 px-1 pb-1">
      <label className="block">
        <span className="mb-2 block text-sm text-zinc-400">File name</span>
        <div className="flex items-center rounded-xl border border-line bg-raised focus-within:border-violet-400/60 focus-within:ring-2 focus-within:ring-violet-500/20">
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            maxLength={120}
            className="h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-white outline-none"
          />
          {ext && <span className="pr-4 text-sm text-zinc-500">{ext}</span>}
        </div>
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!cleaned || unchanged || busy}>
          Save
        </Button>
      </div>
    </form>
  );
}

export function useFileActions(): FileActions {
  const context = useContext(FileActionsContext);
  if (!context) throw new Error("useFileActions must be used inside <FileActionsProvider>");
  return context;
}
