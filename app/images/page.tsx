import type { Metadata } from "next";
import { LibraryView } from "@/components/library/LibraryView";

export const metadata: Metadata = { title: "Images" };

export default function ImagesPage() {
  return <LibraryView view="images" />;
}
