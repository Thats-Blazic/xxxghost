import { Clock, Film, FolderOpen, Image, Star, Trash2, type LucideIcon } from "lucide-react";
import type { ViewKey } from "@/lib/types";

export interface NavEntry {
  view: ViewKey;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV: NavEntry[] = [
  { view: "all", label: "All Files", href: "/", icon: FolderOpen },
  { view: "images", label: "Images", href: "/images", icon: Image },
  { view: "videos", label: "Videos", href: "/videos", icon: Film },
  { view: "recent", label: "Recently Uploaded", href: "/recent", icon: Clock },
  { view: "favorites", label: "Favorites", href: "/favorites", icon: Star },
  { view: "trash", label: "Trash", href: "/trash", icon: Trash2 },
];

/** The five destinations shown in the phone tab bar (the rest live in the drawer). */
export const TAB_BAR: ViewKey[] = ["all", "images", "videos", "favorites", "trash"];
