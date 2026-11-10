"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as db from "@/lib/db";
import { formatBytes } from "@/lib/format";
import { processMedia, resolveMime, sanitizeFileName, validateFile } from "@/lib/media";
import type { MediaMeta } from "@/lib/types";

export type UploadStage = "preparing" | "processing" | "saving";
export type LibraryStatus = "loading" | "ready" | "error";

interface LibraryContextValue {
  items: MediaMeta[];
  status: LibraryStatus;
  errorMessage: string | null;
  addFile: (file: File, onProgress?: (progress: number, stage: UploadStage) => void) => Promise<MediaMeta>;
  getBlob: (id: string) => Promise<Blob | null>;
  rename: (id: string, name: string) => Promise<void>;
  setFavorite: (ids: string[], favorite: boolean) => Promise<void>;
  moveToTrash: (ids: string[]) => Promise<void>;
  restore: (ids: string[]) => Promise<void>;
  deletePermanently: (ids: string[]) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function makeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaMeta[]>([]);
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const load = useCallback(() => {
    db.listMeta()
      .then((all) => {
        setItems(all);
        setStatus("ready");
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Could not open local storage.");
      });
  }, []);

  useEffect(() => {
    load();
    // Keep several open tabs in sync.
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("ghost-xxx-library");
    channel.onmessage = () => load();
    channelRef.current = channel;
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [load]);

  const notifyOtherTabs = useCallback(() => channelRef.current?.postMessage("changed"), []);

  const addFile = useCallback<LibraryContextValue["addFile"]>(
    async (file, onProgress) => {
      const report = onProgress ?? (() => undefined);
      report(0.03, "preparing");

      const validation = validateFile(file);
      if (!validation.ok) throw new Error(validation.error);

      if (navigator.storage?.estimate) {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        if (quota && usage + file.size > quota) {
          throw new Error(
            `Not enough free space in this browser (${formatBytes(Math.max(0, quota - usage))} left).`,
          );
        }
      }
      void navigator.storage?.persist?.().catch(() => undefined);

      report(0.1, "processing");
      const processed = await processMedia(file, validation.kind);

      report(0.6, "saving");
      const mime = resolveMime(file, validation.kind);
      const meta: MediaMeta = {
        id: makeId(),
        name: sanitizeFileName(file.name) || `file-${Date.now()}`,
        mime,
        kind: validation.kind,
        size: file.size,
        createdAt: Date.now(),
        favorite: false,
        trashedAt: null,
        ...processed,
      };

      try {
        await db.saveMedia(meta, new Blob([file], { type: mime }));
      } catch (error) {
        if (db.isQuotaError(error)) {
          throw new Error("Browser storage is full. Delete some files and try again.");
        }
        throw error instanceof Error ? error : new Error("Could not save the file.");
      }

      setItems((previous) => [meta, ...previous]);
      notifyOtherTabs();
      report(1, "saving");
      return meta;
    },
    [notifyOtherTabs],
  );

  const getBlob = useCallback(async (id: string) => (await db.getBlob(id)) ?? null, []);

  /** Applies a patch to metadata records, persists, then updates React state. */
  const patch = useCallback(
    async (ids: string[], change: (meta: MediaMeta) => MediaMeta) => {
      const idSet = new Set(ids);
      const updated = items.filter((item) => idSet.has(item.id)).map(change);
      if (updated.length === 0) return;
      await db.updateMeta(updated);
      const byId = new Map(updated.map((item) => [item.id, item]));
      setItems((previous) => previous.map((item) => byId.get(item.id) ?? item));
      notifyOtherTabs();
    },
    [items, notifyOtherTabs],
  );

  const rename = useCallback<LibraryContextValue["rename"]>(
    (id, name) => patch([id], (meta) => ({ ...meta, name })),
    [patch],
  );

  const setFavorite = useCallback<LibraryContextValue["setFavorite"]>(
    (ids, favorite) => patch(ids, (meta) => ({ ...meta, favorite })),
    [patch],
  );

  const moveToTrash = useCallback<LibraryContextValue["moveToTrash"]>(
    (ids) => patch(ids, (meta) => ({ ...meta, trashedAt: Date.now() })),
    [patch],
  );

  const restore = useCallback<LibraryContextValue["restore"]>(
    (ids) => patch(ids, (meta) => ({ ...meta, trashedAt: null })),
    [patch],
  );

  const deletePermanently = useCallback<LibraryContextValue["deletePermanently"]>(
    async (ids) => {
      if (ids.length === 0) return;
      await db.deleteMedia(ids);
      const idSet = new Set(ids);
      setItems((previous) => previous.filter((item) => !idSet.has(item.id)));
      notifyOtherTabs();
    },
    [notifyOtherTabs],
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      items,
      status,
      errorMessage,
      addFile,
      getBlob,
      rename,
      setFavorite,
      moveToTrash,
      restore,
      deletePermanently,
    }),
    [items, status, errorMessage, addFile, getBlob, rename, setFavorite, moveToTrash, restore, deletePermanently],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return context;
}
