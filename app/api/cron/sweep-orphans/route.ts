import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { APPLICATIONS_BUCKET } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Deletes uploaded objects with no referencing `attachments` row, older than
 * 48h (see migration 0008). Uploads fire on file-select, not on submit, so
 * every abandoned form leaves an unreferenced object with nothing to clean
 * it up otherwise — on the free tier's 1 GB bucket that is a slow,
 * guaranteed outage.
 *
 * Circuit breaker: a bug in the orphan join (e.g. a future change to
 * draftUploadPath's format) could make every object look orphaned. Refusing
 * to delete past MAX_DELETES_PER_RUN turns "lose the entire bucket" into
 * "lose nothing, plus a log line telling you why."
 */
const MAX_DELETES_PER_RUN = 200;
const DELETE_BATCH_SIZE = 100;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  const admin = createAdminClient();

  const { data: orphans, error } = await admin.rpc("list_orphaned_uploads");

  if (error) {
    console.error("[sweep-orphans] list_orphaned_uploads failed", error);
    return NextResponse.json({ error: "Could not list orphaned uploads." }, { status: 500 });
  }

  const paths = (orphans ?? []).map((o: { name: string }) => o.name);

  if (paths.length > MAX_DELETES_PER_RUN) {
    console.error(
      `[sweep-orphans] circuit breaker tripped: ${paths.length} candidates exceeds MAX_DELETES_PER_RUN (${MAX_DELETES_PER_RUN}); deleting nothing`
    );
    return NextResponse.json({
      ok: false,
      breaker: true,
      candidateCount: paths.length,
      message: "Too many orphan candidates; refusing to delete. Investigate before raising the cap.",
    });
  }

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, count: paths.length, paths });
  }

  const deleted: string[] = [];
  for (let i = 0; i < paths.length; i += DELETE_BATCH_SIZE) {
    const batch = paths.slice(i, i + DELETE_BATCH_SIZE);
    const { error: removeError } = await admin.storage.from(APPLICATIONS_BUCKET).remove(batch);
    if (removeError) {
      console.error("[sweep-orphans] remove failed for batch", batch, removeError);
      continue;
    }
    for (const path of batch) {
      console.log("[sweep-orphans] deleted", path);
    }
    deleted.push(...batch);
  }

  return NextResponse.json({ ok: true, dryRun: false, count: deleted.length, paths: deleted });
}
