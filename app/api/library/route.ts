import type { NextRequest } from "next/server";
import { guard, passwordRequired } from "@/lib/server/auth";
import { addItem, listItems, parseNewItem, patchItems, removeItems } from "@/lib/server/library";
import type { MediaPatch } from "@/lib/types";

const noStore = { "Cache-Control": "no-store" };

function failure(error: unknown): Response {
  console.error(error);
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return Response.json({ error: "server_error", message }, { status: 500, headers: noStore });
}

function parseIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return null;
  return value.every((id) => typeof id === "string") ? (value as string[]) : null;
}

export async function GET(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    return Response.json({ items: await listItems(), passwordRequired: passwordRequired() }, { headers: noStore });
  } catch (error) {
    return failure(error);
  }
}

/** Registers a file that the browser has already uploaded to storage. */
export async function POST(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const parsed = parseNewItem(await request.json().catch(() => null));
    if (!parsed) return Response.json({ error: "invalid_item" }, { status: 400 });
    return Response.json({ item: await addItem(parsed) }, { headers: noStore });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const body = (await request.json().catch(() => null)) as { ids?: unknown; patch?: MediaPatch } | null;
    const ids = parseIds(body?.ids);
    if (!ids || !body?.patch || typeof body.patch !== "object") {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    return Response.json({ items: await patchItems(ids, body.patch) }, { headers: noStore });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = parseIds(body?.ids);
    if (!ids) return Response.json({ error: "invalid_request" }, { status: 400 });
    return Response.json({ ids: await removeItems(ids) }, { headers: noStore });
  } catch (error) {
    return failure(error);
  }
}
