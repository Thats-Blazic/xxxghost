import type { MediaMeta, MediaPatch, NewMediaInput } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly missing: string[] = [],
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    });
  } catch {
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0, "network");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string; missing?: string[] };
    throw new ApiError(body.message ?? body.error ?? `Request failed (${response.status})`, response.status, body.error ?? "error", body.missing);
  }
  return (await response.json()) as T;
}

const send = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

export const api = {
  list: () => request<{ items: MediaMeta[]; passwordRequired: boolean }>("/api/library"),
  register: (item: NewMediaInput) => request<{ item: MediaMeta }>("/api/library", send("POST", item)),
  patch: (ids: string[], patch: MediaPatch) => request<{ items: MediaMeta[] }>("/api/library", send("PATCH", { ids, patch })),
  remove: (ids: string[]) => request<{ ids: string[] }>("/api/library", send("DELETE", { ids })),
  login: (password: string) => request<{ ok: true }>("/api/auth", send("POST", { password })),
  logout: () => request<{ ok: true }>("/api/auth", { method: "DELETE" }),
};
