import type { MediaKind } from "./types";

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

const VIDEO_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
};

export const SUPPORTED_LABEL = "JPG, PNG, WEBP, GIF, SVG · MP4, WEBM, MOV, MKV";

export const FILE_INPUT_ACCEPT = [
  ...Object.keys(IMAGE_TYPES).map((ext) => `.${ext}`),
  ...Object.keys(VIDEO_TYPES).map((ext) => `.${ext}`),
  "image/*",
  "video/*",
].join(",");

export function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function splitName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

export function detectKind(name: string): MediaKind | null {
  const ext = getExtension(name);
  if (ext in IMAGE_TYPES) return "image";
  if (ext in VIDEO_TYPES) return "video";
  return null;
}

export function resolveMime(file: { name: string; type: string }, kind: MediaKind): string {
  const ext = getExtension(file.name);
  const table = kind === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  return table[ext] ?? file.type;
}

export type Validation = { ok: true; kind: MediaKind } | { ok: false; error: string };

export function validateFile(file: File): Validation {
  const kind = detectKind(file.name);
  if (!kind) {
    const ext = getExtension(file.name);
    return { ok: false, error: `${ext ? `.${ext}` : "This"} files aren't supported.` };
  }
  if (file.size === 0) return { ok: false, error: "This file is empty." };
  return { ok: true, kind };
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
}

/* -------------------------------------------------------------------------- */
/*                        Thumbnails & metadata extraction                    */
/* -------------------------------------------------------------------------- */

export interface ProcessedMedia {
  width?: number;
  height?: number;
  duration?: number;
  thumb?: Blob;
}

const THUMB_MAX = 640;

function waitFor(target: EventTarget, event: string, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => cleanup(new Error(`Timed out waiting for ${event}`)), timeout);
    const onDone = () => cleanup();
    const onError = () => cleanup(new Error("Media error"));
    function cleanup(error?: Error) {
      window.clearTimeout(timer);
      target.removeEventListener(event, onDone);
      target.removeEventListener("error", onError);
      if (error) reject(error);
      else resolve();
    }
    target.addEventListener(event, onDone, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function drawThumb(
  source: CanvasImageSource,
  width: number,
  height: number,
  allowUpscale = false,
): Promise<Blob | null> {
  if (!width || !height) return null;
  const ratio = THUMB_MAX / Math.max(width, height);
  const scale = allowUpscale ? ratio : Math.min(1, ratio);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, "image/webp", 0.82);
}

async function processImage(file: File): Promise<ProcessedMedia> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    const loaded = waitFor(img, "load", 20_000);
    img.src = url;
    await loaded;
    const isSvg = getExtension(file.name) === "svg";
    const width = img.naturalWidth || (isSvg ? 512 : 0);
    const height = img.naturalHeight || (isSvg ? 512 : 0);
    let thumb: Blob | null = null;
    try {
      thumb = await drawThumb(img, width, height, isSvg);
    } catch {
      thumb = null;
    }
    // Vector images are usually tiny, so the original is a perfect fallback thumbnail.
    if (!thumb && isSvg) thumb = file;
    return { width, height, thumb: thumb ?? undefined };
  } catch {
    return {};
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Some WebM files (e.g. recorded with MediaRecorder) have no duration header, so the browser reports
 * `Infinity`. Seeking far past the end forces it to compute the real duration.
 */
export async function resolveDuration(video: HTMLVideoElement): Promise<number | undefined> {
  if (Number.isFinite(video.duration)) return video.duration;
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, 4000);
    video.addEventListener(
      "timeupdate",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    video.currentTime = 1e101;
  });
  const duration = video.duration;
  video.currentTime = 0;
  return Number.isFinite(duration) && duration > 0 ? duration : undefined;
}

async function processVideo(file: File): Promise<ProcessedMedia> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const metadata = waitFor(video, "loadedmetadata", 12_000);
    video.src = url;
    await metadata;

    const duration = await resolveDuration(video);
    const width = video.videoWidth;
    const height = video.videoHeight;

    let thumb: Blob | null = null;
    try {
      const target = duration ? Math.max(0.1, Math.min(duration * 0.1, 2)) : 0.1;
      const seeked = waitFor(video, "seeked", 10_000);
      video.currentTime = target;
      await seeked;
      thumb = await drawThumb(video, width, height);
    } catch {
      thumb = null;
    }
    return { width, height, duration, thumb: thumb ?? undefined };
  } catch {
    return {};
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export function processMedia(file: File, kind: MediaKind): Promise<ProcessedMedia> {
  return kind === "image" ? processImage(file) : processVideo(file);
}

/**
 * Chrome plays H.264/VP9 Matroska files when they're labelled as WebM, so for playback
 * we re-label MKV blobs (no data is copied, blobs are references).
 */
export function playbackBlob(blob: Blob, name: string): Blob {
  if (getExtension(name) === "mkv") return new Blob([blob], { type: "video/webm" });
  return blob;
}
