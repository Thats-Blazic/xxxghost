"use client";

import { useEffect, useState } from "react";

/**
 * Creates an object URL for a blob and revokes it as soon as the blob changes
 * or the component unmounts, so previews never leak memory.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [state, setState] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with an external resource (object URL)
    setState({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return blob && state && state.blob === blob ? state.url : null;
}
