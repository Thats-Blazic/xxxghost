import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "ghost_xxx_session";
const SESSION_DAYS = 90;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

export function passwordRequired(): boolean {
  return Boolean(process.env.VAULT_PASSWORD);
}

/** Environment variables that still need to be set before the vault can work. */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.BLOB_READ_WRITE_TOKEN) missing.push("BLOB_READ_WRITE_TOKEN");
  // A public deployment without a password would let anyone upload, view and delete files.
  if (process.env.NODE_ENV === "production" && !process.env.VAULT_PASSWORD) missing.push("VAULT_PASSWORD");
  return missing;
}

function sessionToken(password: string): string {
  return createHmac("sha256", password).update("ghost-xxx-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = createHmac("sha256", "compare").update(a).digest();
  const right = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(left, right);
}

/** Value to store in the session cookie after a correct password, or null when the password is wrong. */
export function loginToken(input: string): string | null {
  const password = process.env.VAULT_PASSWORD;
  if (!password) return null;
  return safeEqual(input, password) ? sessionToken(password) : null;
}

export function isAuthorized(request: NextRequest): boolean {
  const password = process.env.VAULT_PASSWORD;
  if (!password) return process.env.NODE_ENV !== "production"; // open only for local development
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  return Boolean(cookie) && safeEqual(cookie as string, sessionToken(password));
}

/** Returns an error response when the request must not continue, otherwise null. */
export function guard(request: NextRequest): Response | null {
  const missing = missingConfig();
  if (missing.length > 0) {
    return Response.json({ error: "not_configured", missing }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return Response.json({ error: "locked" }, { status: 401 });
  }
  return null;
}
