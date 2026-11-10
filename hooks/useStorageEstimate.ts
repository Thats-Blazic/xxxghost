"use client";

import { useEffect, useState } from "react";

export interface StorageEstimateInfo {
  usage: number;
  quota: number;
}

/** Browser-wide storage usage/quota for this origin. Re-reads whenever `refreshKey` changes. */
export function useStorageEstimate(refreshKey: unknown): StorageEstimateInfo | null {
  const [estimate, setEstimate] = useState<StorageEstimateInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) return;
    navigator.storage
      .estimate()
      .then((result) => {
        if (!cancelled && result.quota) {
          setEstimate({ usage: result.usage ?? 0, quota: result.quota });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return estimate;
}
