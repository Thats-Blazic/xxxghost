import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";

export const metadata: Metadata = { title: "Videos" };

export default function VideosPage() {
  return <LibraryView view="videos" />;
}
