export type MediaKind = "image" | "video";

/** Metadata record kept in the `meta` IndexedDB store. The original file lives in the `blobs` store. */
export interface MediaMeta {
  id: string;
  name: string;
  mime: string;
  kind: MediaKind;
  size: number;
  createdAt: number;
  favorite: boolean;
  /** Timestamp when moved to Trash, `null` when the file is active. */
  trashedAt: number | null;
  width?: number;
  height?: number;
  /** Video duration in seconds. */
  duration?: number;
  /** Small preview image (webp/png) so the grid never needs to load full files. */
  thumb?: Blob;
}

export type SortKey = "newest" | "oldest" | "name" | "size";
export type ViewKey = "all" | "images" | "videos" | "recent" | "favorites" | "trash";
export type LayoutMode = "grid" | "list";
