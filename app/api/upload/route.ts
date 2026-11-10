import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { NextRequest } from "next/server";
import { guard } from "@/lib/server/auth";

/**
 * Hands the browser a short-lived token so it can upload straight to Vercel Blob.
 * Files never pass through this function, so there is no 4.5 MB request limit and big videos work.
 */
export async function POST(request: NextRequest) {
  const blocked = guard(request);
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^(files|thumbs)\/[a-z0-9]{8,40}\//.test(pathname)) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: ["image/*", "video/*"],
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });
    return Response.json(json);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
