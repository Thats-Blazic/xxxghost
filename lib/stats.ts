import type { MediaMeta } from "./types";

export interface LibraryStats {
  files: number;
  images: number;
  videos: number;
  imageBytes: number;
  videoBytes: number;
  trashBytes: number;
  activeBytes: number;
  totalBytes: number;
}

export function computeStats(items: MediaMeta[]): LibraryStats {
  const stats: LibraryStats = {
    files: 0,
    images: 0,
    videos: 0,
    imageBytes: 0,
    videoBytes: 0,
    trashBytes: 0,
    activeBytes: 0,
    totalBytes: 0,
  };
  for (const item of items) {
    stats.totalBytes += item.size;
    if (item.trashedAt !== null) {
      stats.trashBytes += item.size;
      continue;
    }
    stats.files += 1;
    stats.activeBytes += item.size;
    if (item.kind === "image") {
      stats.images += 1;
      stats.imageBytes += item.size;
    } else {
      stats.videos += 1;
      stats.videoBytes += item.size;
    }
  }
  return stats;
}
