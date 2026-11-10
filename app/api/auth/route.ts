import type { NextRequest } from "next/server";
import { isAuthorized, loginToken, passwordRequired, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  return Response.json(
    { required: passwordRequired(), authenticated: isAuthorized(request) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const token = typeof body?.password === "string" ? loginToken(body.password) : null;

  if (!token) {
    // Slow down password guessing.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return Response.json({ error: "wrong_password" }, { status: 401 });
  }

  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  return response;
}

/** Log out. */
export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}
