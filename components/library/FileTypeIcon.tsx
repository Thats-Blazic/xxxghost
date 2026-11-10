import { Clapperboard, FileImage, FileVideo, Film, Images, Shapes, type LucideIcon } from "lucide-react";
import { getExtension } from "@/lib/media";
import type { MediaMeta } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
  webp: FileImage,
  gif: Images,
  svg: Shapes,
  mp4: Clapperboard,
  webm: Film,
  mov: Clapperboard,
  mkv: FileVideo,
};

export function FileTypeIcon({ item, className }: { item: Pick<MediaMeta, "name" | "kind">; className?: string }) {
  const Icon = ICONS[getExtension(item.name)] ?? (item.kind === "video" ? FileVideo : FileImage);
  return <Icon className={className} />;
}
