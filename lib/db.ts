import type { MediaMeta } from "./types";

/**
 * Thin promise wrapper around IndexedDB.
 *
 * Two object stores:
 *  - `meta`  : small records (name, size, favorite, thumbnail ...) loaded all at once.
 *  - `blobs` : the original files, only read on demand (preview / download).
 */
const DB_NAME = "ghost-xxx-vault";
const DB_VERSION = 1;
const META = "meta";
const BLOBS = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is not available in this browser."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
        if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error("Could not open the local database."));
      };
    });
  }
  return dbPromise;
}

async function transact<T = void>(
  stores: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const request = work(tx);
    tx.oncomplete = () => resolve((request ? request.result : undefined) as T);
    tx.onerror = () => reject(tx.error ?? request?.error);
    tx.onabort = () => reject(tx.error ?? new DOMException("Transaction aborted", "AbortError"));
  });
}

export function listMeta(): Promise<MediaMeta[]> {
  return transact<MediaMeta[]>([META], "readonly", (tx) => tx.objectStore(META).getAll());
}

/** Writes metadata and the original file in a single atomic transaction. */
export function saveMedia(meta: MediaMeta, blob: Blob): Promise<IDBValidKey> {
  return transact<IDBValidKey>([META, BLOBS], "readwrite", (tx) => {
    tx.objectStore(META).put(meta);
    return tx.objectStore(BLOBS).put(blob, meta.id);
  });
}

export function updateMeta(metas: MediaMeta[]): Promise<void> {
  return transact([META], "readwrite", (tx) => {
    const store = tx.objectStore(META);
    metas.forEach((meta) => store.put(meta));
  });
}

export function getBlob(id: string): Promise<Blob | undefined> {
  return transact<Blob | undefined>([BLOBS], "readonly", (tx) => tx.objectStore(BLOBS).get(id));
}

export function deleteMedia(ids: string[]): Promise<void> {
  return transact([META, BLOBS], "readwrite", (tx) => {
    const meta = tx.objectStore(META);
    const blobs = tx.objectStore(BLOBS);
    ids.forEach((id) => {
      meta.delete(id);
      blobs.delete(id);
    });
  });
}

export function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}
