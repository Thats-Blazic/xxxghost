"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { validateFile } from "@/lib/media";
import type { MediaKind } from "@/lib/types";
import { useLibrary, type UploadStage } from "./LibraryProvider";
import { useToast } from "./ToastProvider";

export type UploadStatus = "ready" | "invalid" | "uploading" | "done" | "error";

export interface UploadEntry {
  id: string;
  file: File;
  kind: MediaKind | null;
  status: UploadStatus;
  progress: number;
  stage?: UploadStage;
  error?: string;
}

interface UploadContextValue {
  entries: UploadEntry[];
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Opens the dialog (if needed) and stages files for upload. */
  addFiles: (files: Iterable<File>) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
  start: () => Promise<void>;
  uploading: boolean;
}

const UploadContext = createContext<UploadContextValue | null>(null);
const CONCURRENCY = 3;
let entryCounter = 0;

export function UploadProvider({ children }: { children: ReactNode }) {
  const { addFile } = useLibrary();
  const toast = useToast();
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [open, setOpen] = useState(false);
  const entriesRef = useRef<UploadEntry[]>([]);

  /** Single write path so the ref (read by `start`) and React state never diverge. */
  const update = useCallback((change: (current: UploadEntry[]) => UploadEntry[]) => {
    entriesRef.current = change(entriesRef.current);
    setEntries(entriesRef.current);
  }, []);

  const patchEntry = useCallback(
    (id: string, patch: Partial<UploadEntry>) => {
      update((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
    },
    [update],
  );

  const addFiles = useCallback(
    (files: Iterable<File>) => {
      const staged: UploadEntry[] = Array.from(files).map((file) => {
        const validation = validateFile(file);
        entryCounter += 1;
        return validation.ok
          ? { id: `u${entryCounter}`, file, kind: validation.kind, status: "ready", progress: 0 }
          : { id: `u${entryCounter}`, file, kind: null, status: "invalid", progress: 0, error: validation.error };
      });
      if (staged.length === 0) return;
      update((current) => [...current, ...staged]);
      setOpen(true);
    },
    [update],
  );

  const remove = useCallback(
    (id: string) => update((current) => current.filter((entry) => entry.id !== id)),
    [update],
  );

  const clearFinished = useCallback(
    () => update((current) => current.filter((entry) => entry.status !== "done" && entry.status !== "invalid")),
    [update],
  );

  const start = useCallback(async () => {
    const queue = entriesRef.current.filter((entry) => entry.status === "ready");
    if (queue.length === 0) return;
    queue.forEach((entry) => patchEntry(entry.id, { status: "uploading", progress: 0, stage: "preparing" }));

    let succeeded = 0;
    let failed = 0;
    let lastError = "";

    const worker = async () => {
      for (let entry = queue.shift(); entry; entry = queue.shift()) {
        const current = entry;
        try {
          await addFile(current.file, (progress, stage) => patchEntry(current.id, { progress, stage }));
          patchEntry(current.id, { status: "done", progress: 1 });
          succeeded += 1;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Upload failed.";
          patchEntry(current.id, { status: "error", error: lastError });
          failed += 1;
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    if (succeeded > 0) {
      toast({
        type: "success",
        title: succeeded === 1 ? "Upload complete" : `${succeeded} files uploaded`,
        description: "Your files are saved in this browser.",
      });
    }
    if (failed > 0) {
      toast({
        type: "error",
        title: failed === 1 ? "1 upload failed" : `${failed} uploads failed`,
        description: lastError,
        duration: 7000,
      });
    }
  }, [addFile, patchEntry, toast]);

  const uploading = entries.some((entry) => entry.status === "uploading");

  const value = useMemo<UploadContextValue>(
    () => ({ entries, open, setOpen, addFiles, remove, clearFinished, start, uploading }),
    [entries, open, addFiles, remove, clearFinished, start, uploading],
  );

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUpload(): UploadContextValue {
  const context = useContext(UploadContext);
  if (!context) throw new Error("useUpload must be used inside <UploadProvider>");
  return context;
}
