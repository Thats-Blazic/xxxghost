"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Persistent storage tells the browser never to evict this site's data when disk space runs low.
 * `persisted` is `null` while checking, or when the browser doesn't support the API.
 */
export function usePersistentStorage() {
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.storage?.persisted) return;
    let cancelled = false;
    navigator.storage
      .persisted()
      .then((value) => !cancelled && setPersisted(value))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    if (!navigator.storage?.persist) return false;
    const granted = await navigator.storage.persist();
    setPersisted(granted);
    return granted;
  }, []);

  return { persisted, request };
}
