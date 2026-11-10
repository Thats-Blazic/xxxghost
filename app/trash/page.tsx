import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";

export const metadata: Metadata = { title: "Trash" };

export default function TrashPage() {
  return <LibraryView view="trash" />;
}
