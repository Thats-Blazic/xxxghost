"use client";

import { useEffect, useState } from "react";
import { useLibrary } from "@/components/providers/LibraryProvider";

export interface MediaBlobResult {
  id: string;
  blob: Blob | null;
}

/** Loads the original file for an id from IndexedDB. Returns `null` while loading. */
export function useMediaBlob(id: string): MediaBlobResult | null {
  const { getBlob } = useLibrary();
  const [result, setResult] = useState<MediaBlobResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBlob(id)
      .then((blob) => {
        if (!cancelled) setResult({ id, blob });
      })
      .catch(() => {
        if (!cancelled) setResult({ id, blob: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id, getBlob]);

  return result && result.id === id ? result : null;
}
