import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";

export const metadata: Metadata = { title: "Recently Uploaded" };

export default function RecentPage() {
  return <LibraryView view="recent" />;
}
