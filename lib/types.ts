export type MediaKind = "image" | "video";

/** One file in the vault. The record lives in the cloud index, the file itself in Vercel Blob. */
export interface MediaMeta {
  id: string;
  name: string;
  /** MIME type of the original file. */
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
  /** URL the original file is streamed / displayed from. */
  url: string;
  /** URL that makes the browser download the original file. */
  downloadUrl: string;
  /** Small preview image so grids never need to load full files. */
  thumbUrl?: string;
}

/** What the browser sends after it finished uploading a file to storage. */
export type NewMediaInput = Pick<
  MediaMeta,
  "id" | "name" | "mime" | "kind" | "size" | "width" | "height" | "duration" | "url" | "downloadUrl" | "thumbUrl"
>;

export interface MediaPatch {
  name?: string;
  favorite?: boolean;
  trashed?: boolean;
}

export type SortKey = "newest" | "oldest" | "name" | "size";
export type ViewKey = "all" | "images" | "videos" | "recent" | "favorites" | "trash";
export type LayoutMode = "grid" | "list";
