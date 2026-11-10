import type { MediaMeta, SortKey, ViewKey } from "./types";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "size", label: "Size (largest)" },
];

export function sortItems(items: MediaMeta[], sort: SortKey): MediaMeta[] {
  const copy = [...items];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => a.createdAt - b.createdAt);
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    case "size":
      return copy.sort((a, b) => b.size - a.size);
    default:
      return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

export function belongsToView(item: MediaMeta, view: ViewKey): boolean {
  if (view === "trash") return item.trashedAt !== null;
  if (item.trashedAt !== null) return false;
  switch (view) {
    case "images":
      return item.kind === "image";
    case "videos":
      return item.kind === "video";
    case "favorites":
      return item.favorite;
    default:
      return true;
  }
}
