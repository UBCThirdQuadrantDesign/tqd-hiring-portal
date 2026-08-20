import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import { APPLICATIONS_BUCKET, draftUploadPath } from "@/lib/storage";
import { application } from "@/content/application";

/**
 * Mints a signed upload URL for a résumé or portfolio file, direct to
 * Supabase Storage. Vercel Server Actions cap request bodies around
 * 4.5MB, so a 10-50MB file can never route through one — the browser
 * PUTs straight to storage instead. Uploads start on file-select, not on
 * submit; see app/(public)/apply-form.tsx.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind = body?.kind as "resume" | "portfolio" | undefined;
  const filename = body?.filename as string | undefined;
  const size = body?.size as number | undefined;
  const draftId = (body?.draftId as string | undefined) || nanoid();

  const question = application.questions.find(
    (q) => q.id === kind && q.type === "file"
  );
  if (!question || question.type !== "file") {
    return NextResponse.json({ error: "Unknown upload kind." }, { status: 400 });
  }
  if (!filename) {
    return NextResponse.json({ error: "Missing filename." }, { status: 400 });
  }
  if (typeof size === "number" && size > question.maxSize) {
    return NextResponse.json(
      { error: `${question.label} must be under ${Math.round(question.maxSize / 1_000_000)}MB.` },
      { status: 400 }
    );
  }

  const path = draftUploadPath(draftId, `${kind}-${filename}`);
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(APPLICATIONS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    // Storage errors here are almost always configuration, not user input —
    // most often a missing `applications` bucket. Log the real cause so it
    // is not swallowed by the generic message the applicant sees.
    console.error("[upload-url] could not sign upload for", path, error);
    return NextResponse.json({ error: "Could not create upload URL." }, { status: 500 });
  }

  return NextResponse.json({
    draftId,
    path,
    signedUrl: data.signedUrl,
    token: data.token,
  });
}
