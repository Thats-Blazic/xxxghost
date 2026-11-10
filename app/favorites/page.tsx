import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";

export const metadata: Metadata = { title: "Favorites" };

export default function FavoritesPage() {
  return <LibraryView view="favorites" />;
}
