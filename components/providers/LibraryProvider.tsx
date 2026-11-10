"use client";

import { upload } from "@vercel/blob/client";
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
import { api, ApiError } from "@/lib/api";
import { processMedia, resolveMime, sanitizeFileName, uploadContentType, validateFile } from "@/lib/media";
import type { MediaMeta, MediaPatch, NewMediaInput } from "@/lib/types";

export type UploadStage = "preparing" | "processing" | "uploading" | "saving";
export type LibraryStatus = "loading" | "ready" | "error" | "locked" | "unconfigured";

const MULTIPART_THRESHOLD = 40 * 1024 * 1024;

interface LibraryContextValue {
  items: MediaMeta[];
  status: LibraryStatus;
  errorMessage: string | null;
  /** Environment variables the server still needs (only when status is "unconfigured"). */
  missingConfig: string[];
  passwordRequired: boolean;
  addFile: (file: File, onProgress?: (progress: number, stage: UploadStage) => void) => Promise<MediaMeta>;
  rename: (id: string, name: string) => Promise<void>;
  setFavorite: (ids: string[], favorite: boolean) => Promise<void>;
  moveToTrash: (ids: string[]) => Promise<void>;
  restore: (ids: string[]) => Promise<void>;
  deletePermanently: (ids: string[]) => Promise<void>;
  reload: () => void;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

/** Unguessable id: it is part of the file's public URL. */
function makeId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Files upload in parallel, but adding them to the shared index happens one at a time so they
 * never fight over it. A transient failure is retried a few times.
 */
let registerChain: Promise<unknown> = Promise.resolve();

function registerInOrder(item: NewMediaInput): Promise<{ item: MediaMeta }> {
  const run = registerChain.then(async () => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await api.register(item);
      } catch (error) {
        const transient = error instanceof ApiError && (error.status >= 500 || error.status === 409 || error.status === 0);
        if (!transient || attempt >= 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
      }
    }
  });
  registerChain = run.catch(() => undefined);
  return run;
}

function describeUploadError(error: unknown): Error {
  if (error instanceof ApiError) return error;
  const message = error instanceof Error ? error.message : "Upload failed.";
  if (/token|unauthor|401/i.test(message)) return new Error("You're locked out. Reload the page and enter your password again.");
  if (/not.?configured|BLOB_READ_WRITE_TOKEN/i.test(message)) return new Error("Cloud storage isn't set up yet.");
  if (/exceeded|quota|limit/i.test(message)) return new Error("Your cloud storage is full or over its plan limit.");
  return new Error(message);
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaMeta[]>([]);
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingConfig, setMissingConfig] = useState<string[]>([]);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const statusRef = useRef<LibraryStatus>("loading");

  const applyStatus = useCallback((next: LibraryStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const load = useCallback(() => {
    api
      .list()
      .then((result) => {
        setItems(result.items);
        setPasswordRequired(result.passwordRequired);
        setErrorMessage(null);
        applyStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.code === "locked") {
          applyStatus("locked");
        } else if (error instanceof ApiError && error.code === "not_configured") {
          setMissingConfig(error.missing);
          applyStatus("unconfigured");
        } else {
          setErrorMessage(error instanceof Error ? error.message : "Could not load your files.");
          // Keep showing files we already have when a background refresh fails.
          if (statusRef.current !== "ready") applyStatus("error");
        }
      });
  }, [applyStatus]);

  useEffect(() => {
    load();

    // Keep other tabs and other devices fresh.
    const refresh = () => statusRef.current === "ready" && document.visibilityState === "visible" && load();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("ghost-xxx-library");
      channel.onmessage = () => load();
      channelRef.current = channel;
    }
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      channel?.close();
      channelRef.current = null;
    };
  }, [load]);

  const notifyOtherTabs = useCallback(() => channelRef.current?.postMessage("changed"), []);

  const handleAuthLoss = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.code === "locked") applyStatus("locked");
    },
    [applyStatus],
  );

  const addFile = useCallback<LibraryContextValue["addFile"]>(
    async (file, onProgress) => {
      const report = onProgress ?? (() => undefined);
      report(0.02, "preparing");

      const validation = validateFile(file);
      if (!validation.ok) throw new Error(validation.error);
      const { kind } = validation;

      report(0.04, "processing");
      const processed = await processMedia(file, kind);

      const id = makeId();
      const name = sanitizeFileName(file.name) || `file-${Date.now()}`;
      const mime = resolveMime(file, kind);

      try {
        report(0.1, "uploading");
        const uploaded = await upload(`files/${id}/${name}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: uploadContentType(file, kind),
          multipart: file.size > MULTIPART_THRESHOLD,
          onUploadProgress: ({ percentage }) => report(0.1 + (percentage / 100) * 0.8, "uploading"),
        });

        let thumbUrl: string | undefined;
        if (processed.thumb) {
          report(0.92, "saving");
          try {
            const thumb = await upload(`thumbs/${id}/thumb`, processed.thumb, {
              access: "public",
              handleUploadUrl: "/api/upload",
              contentType: processed.thumb.type || "image/webp",
            });
            thumbUrl = thumb.url;
          } catch {
            // A missing thumbnail is not worth failing the upload for.
          }
        }

        report(0.96, "saving");
        const { item } = await registerInOrder({
          id,
          name,
          mime,
          kind,
          size: file.size,
          width: processed.width,
          height: processed.height,
          duration: processed.duration,
          url: uploaded.url,
          downloadUrl: uploaded.downloadUrl,
          thumbUrl,
        });

        setItems((previous) => [item, ...previous.filter((existing) => existing.id !== item.id)]);
        notifyOtherTabs();
        report(1, "saving");
        return item;
      } catch (error) {
        handleAuthLoss(error);
        throw describeUploadError(error);
      }
    },
    [notifyOtherTabs, handleAuthLoss],
  );

  const applyUpdated = useCallback(
    (updated: MediaMeta[]) => {
      const byId = new Map(updated.map((item) => [item.id, item]));
      setItems((previous) => previous.map((item) => byId.get(item.id) ?? item));
      notifyOtherTabs();
    },
    [notifyOtherTabs],
  );

  const patch = useCallback(
    async (ids: string[], change: MediaPatch) => {
      try {
        const result = await api.patch(ids, change);
        applyUpdated(result.items);
      } catch (error) {
        handleAuthLoss(error);
        throw error;
      }
    },
    [applyUpdated, handleAuthLoss],
  );

  const rename = useCallback<LibraryContextValue["rename"]>((id, name) => patch([id], { name }), [patch]);
  const setFavorite = useCallback<LibraryContextValue["setFavorite"]>(
    (ids, favorite) => patch(ids, { favorite }),
    [patch],
  );
  const moveToTrash = useCallback<LibraryContextValue["moveToTrash"]>((ids) => patch(ids, { trashed: true }), [patch]);
  const restore = useCallback<LibraryContextValue["restore"]>((ids) => patch(ids, { trashed: false }), [patch]);

  const deletePermanently = useCallback<LibraryContextValue["deletePermanently"]>(
    async (ids) => {
      if (ids.length === 0) return;
      try {
        const result = await api.remove(ids);
        const removed = new Set(result.ids);
        setItems((previous) => previous.filter((item) => !removed.has(item.id)));
        notifyOtherTabs();
      } catch (error) {
        handleAuthLoss(error);
        throw error;
      }
    },
    [notifyOtherTabs, handleAuthLoss],
  );

  const unlock = useCallback(
    async (password: string) => {
      await api.login(password);
      applyStatus("loading");
      load();
    },
    [applyStatus, load],
  );

  const lock = useCallback(async () => {
    await api.logout();
    setItems([]);
    applyStatus("locked");
  }, [applyStatus]);

  const value = useMemo<LibraryContextValue>(
    () => ({
      items,
      status,
      errorMessage,
      missingConfig,
      passwordRequired,
      addFile,
      rename,
      setFavorite,
      moveToTrash,
      restore,
      deletePermanently,
      reload: load,
      unlock,
      lock,
    }),
    [
      items,
      status,
      errorMessage,
      missingConfig,
      passwordRequired,
      addFile,
      rename,
      setFavorite,
      moveToTrash,
      restore,
      deletePermanently,
      load,
      unlock,
      lock,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return context;
}
