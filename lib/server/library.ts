import "server-only";
import { createHmac } from "node:crypto";
import { BlobPreconditionFailedError, del, get, put } from "@vercel/blob";
import type { MediaKind, MediaMeta, MediaPatch, NewMediaInput } from "@/lib/types";

/**
 * The library index is a single JSON blob holding every file's metadata. Writes use the blob's ETag
 * (`ifMatch`) so two concurrent changes can never overwrite each other: the loser re-reads and retries.
 *
 * The path is derived from the server-only token, so nobody can guess where the index (and with it
 * every file URL) lives.
 */
function indexPath(): string {
  const secret = process.env.BLOB_READ_WRITE_TOKEN ?? "dev";
  const hash = createHmac("sha256", secret).update("ghost-xxx-index-v1").digest("hex").slice(0, 32);
  return `library/index-${hash}.json`;
}

interface IndexFile {
  version: 1;
  items: MediaMeta[];
}

async function readIndex(): Promise<{ items: MediaMeta[]; etag: string | null }> {
  const result = await get(indexPath(), { access: "public", useCache: false });
  if (!result || result.statusCode !== 200) return { items: [], etag: null };
  const parsed = JSON.parse(await new Response(result.stream).text()) as Partial<IndexFile>;
  return { items: Array.isArray(parsed.items) ? parsed.items : [], etag: result.blob.etag };
}

async function writeIndex(items: MediaMeta[], etag: string | null): Promise<void> {
  const body: IndexFile = { version: 1, items };
  await put(indexPath(), JSON.stringify(body), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    ...(etag ? { ifMatch: etag } : {}),
  });
}

export async function listItems(): Promise<MediaMeta[]> {
  return (await readIndex()).items;
}

/** Read-modify-write with optimistic concurrency. */
async function mutate<T>(change: (items: MediaMeta[]) => { items: MediaMeta[]; result: T }): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { items, etag } = await readIndex();
    const next = change(items);
    try {
      await writeIndex(next.items, etag);
      return next.result;
    } catch (error) {
      lastError = error;
      const conflict = error instanceof BlobPreconditionFailedError || etag === null;
      if (!conflict) throw error;
      await new Promise((resolve) => setTimeout(resolve, 80 + Math.random() * 220));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not update the library, please try again.");
}

/* -------------------------------------------------------------------------- */
/*                                 Validation                                 */
/* -------------------------------------------------------------------------- */

const ID_PATTERN = /^[a-z0-9]{8,40}$/;

/** Only accept URLs that really point into a Vercel Blob store, inside the expected folder. */
function isBlobUrl(value: unknown, folder: "files" | "thumbs", id: string): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".blob.vercel-storage.com") &&
      decodeURIComponent(url.pathname).startsWith(`/${folder}/${id}/`)
    );
  } catch {
    return false;
  }
}

function cleanName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 150);
}

function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function parseNewItem(input: Partial<NewMediaInput> | null | undefined): Omit<MediaMeta, "createdAt" | "favorite" | "trashedAt"> | null {
  if (!input || typeof input.id !== "string" || !ID_PATTERN.test(input.id)) return null;
  const name = cleanName(input.name);
  const kind: MediaKind | null = input.kind === "image" || input.kind === "video" ? input.kind : null;
  const size = positive(input.size);
  if (!name || !kind || !size) return null;
  if (!isBlobUrl(input.url, "files", input.id) || !isBlobUrl(input.downloadUrl, "files", input.id)) return null;
  const thumbUrl = isBlobUrl(input.thumbUrl, "thumbs", input.id) ? input.thumbUrl : undefined;

  return {
    id: input.id,
    name,
    mime: typeof input.mime === "string" ? input.mime.slice(0, 100) : "",
    kind,
    size,
    width: positive(input.width),
    height: positive(input.height),
    duration: positive(input.duration),
    url: input.url,
    downloadUrl: input.downloadUrl,
    thumbUrl,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Mutations                                 */
/* -------------------------------------------------------------------------- */

export function addItem(parsed: NonNullable<ReturnType<typeof parseNewItem>>): Promise<MediaMeta> {
  const item: MediaMeta = { ...parsed, createdAt: Date.now(), favorite: false, trashedAt: null };
  return mutate((items) => ({
    items: [item, ...items.filter((existing) => existing.id !== item.id)],
    result: item,
  }));
}

export function patchItems(ids: string[], patch: MediaPatch): Promise<MediaMeta[]> {
  const idSet = new Set(ids);
  const name = patch.name === undefined ? undefined : cleanName(patch.name);
  return mutate((items) => {
    const updated: MediaMeta[] = [];
    const next = items.map((item) => {
      if (!idSet.has(item.id)) return item;
      const changed: MediaMeta = {
        ...item,
        ...(name ? { name } : {}),
        ...(typeof patch.favorite === "boolean" ? { favorite: patch.favorite } : {}),
        ...(typeof patch.trashed === "boolean" ? { trashedAt: patch.trashed ? Date.now() : null } : {}),
      };
      updated.push(changed);
      return changed;
    });
    return { items: next, result: updated };
  });
}

/** Removes the records first, then the stored files (so the index never points at missing files). */
export async function removeItems(ids: string[]): Promise<string[]> {
  const idSet = new Set(ids);
  const removed = await mutate((items) => ({
    items: items.filter((item) => !idSet.has(item.id)),
    result: items.filter((item) => idSet.has(item.id)),
  }));
  const urls = removed.flatMap((item) => [item.url, ...(item.thumbUrl ? [item.thumbUrl] : [])]);
  if (urls.length > 0) {
    try {
      await del(urls);
    } catch (error) {
      console.error("Could not delete some stored files", error);
    }
  }
  return removed.map((item) => item.id);
}
