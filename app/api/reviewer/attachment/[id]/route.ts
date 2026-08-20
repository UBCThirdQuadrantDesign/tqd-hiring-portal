import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { APPLICATIONS_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/storage";

/**
 * Redirects to a freshly minted signed URL for one attachment.
 *
 * Signed URLs used to be minted when the applicant panel loaded, which
 * cost a second serial round trip to Storage on every open (the paths
 * aren't known until the attachments query returns) and burned the
 * 60s TTL while the reviewer was still reading. Minting on click drops
 * that wave from the open path and starts the TTL when the link is
 * actually used.
 *
 * The row read below runs as the signed-in user, so RLS (is_reviewer())
 * is the access gate — a non-reviewer resolves to zero rows and gets a
 * 404 before the service-role key is ever touched.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: attachment } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (!attachment) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data, error } = await createAdminClient()
    .storage.from(APPLICATIONS_BUCKET)
    .createSignedUrl(attachment.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Could not sign file." }, { status: 502 });
  }

  return NextResponse.redirect(data.signedUrl);
}
