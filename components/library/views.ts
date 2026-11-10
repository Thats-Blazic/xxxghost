import { Clock, Film, FolderOpen, Image, Star, Trash2, type LucideIcon } from "lucide-react";
import type { ViewKey } from "@/lib/types";

interface ViewConfig {
  title: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}

export const VIEW_CONFIG: Record<ViewKey, ViewConfig> = {
  all: {
    title: "All Files",
    icon: FolderOpen,
    emptyTitle: "Your vault is empty",
    emptyDescription: "Upload your first photos and videos. They stay private and are saved right in this browser.",
  },
  images: {
    title: "Images",
    icon: Image,
    emptyTitle: "No images yet",
    emptyDescription: "Upload JPG, PNG, WEBP, GIF or SVG files and they will show up here.",
  },
  videos: {
    title: "Videos",
    icon: Film,
    emptyTitle: "No videos yet",
    emptyDescription: "Upload MP4, WEBM, MOV or MKV files to watch them with the built-in player.",
  },
  recent: {
    title: "Recently Uploaded",
    icon: Clock,
    emptyTitle: "Nothing uploaded recently",
    emptyDescription: "Your latest uploads will appear here, newest first.",
  },
  favorites: {
    title: "Favorites",
    icon: Star,
    emptyTitle: "No favorites yet",
    emptyDescription: "Open a file's menu and choose “Add to Favorites” to pin it here for quick access.",
  },
  trash: {
    title: "Trash",
    icon: Trash2,
    emptyTitle: "Trash is empty",
    emptyDescription: "Deleted files wait here until you restore them or empty the Trash.",
  },
};

/** Views that only ever contain one kind of media, so the kind filter is hidden. */
export const FIXED_KIND_VIEWS: ReadonlySet<ViewKey> = new Set<ViewKey>(["images", "videos"]);
