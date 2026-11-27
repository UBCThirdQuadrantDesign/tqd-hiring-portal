// Delete a retired round's résumés/portfolios from Supabase Storage, freeing
// the free tier's 1 GB bucket. Application rows, notes and stage history stay.
//
//   node --env-file=.env.local scripts/purge-round-files.mjs [label]            # dry run
//   node --env-file=.env.local scripts/purge-round-files.mjs [label] --confirm  # delete
//
// Guards, in order:
//   1. exports/<label>/manifest.json exists and is verified (archive-round.mjs)
//   2. only attachments of applications with retired_at set (migration 0015)
//   3. every attachment to delete is in the manifest with a matching size
// Objects go through the Storage API — deleting storage.objects rows directly
// would orphan the bytes (see migration 0008). The attachments rows are then
// removed; their filenames/sizes live on in the export.

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const BUCKET = "applications";
const BATCH = 100;
const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith("--")) ?? "2026-27-round1";
const confirm = args.includes("--confirm");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function fail(msg) {
  console.error(`Refusing to purge: ${msg}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(await readFile(path.resolve("exports", label, "manifest.json"), "utf8"));
} catch {
  fail(`no exports/${label}/manifest.json — run scripts/archive-round.mjs first.`);
}
if (!manifest.verified) fail("the export manifest is not verified.");

const { data: retired, error: appErr } = await db
  .from("applications")
  .select("id")
  .not("retired_at", "is", null);
if (appErr) fail(`could not read retired applications (${appErr.message}). Has migration 0015 been applied?`);
if (retired.length === 0) fail("no retired applications. Apply migration 0015 first.");

const retiredIds = retired.map((a) => a.id);
const attachments = [];
for (let i = 0; i < retiredIds.length; i += BATCH) {
  const { data, error } = await db
    .from("attachments")
    .select("id, storage_path, size_bytes")
    .in("application_id", retiredIds.slice(i, i + BATCH));
  if (error) fail(error.message);
  attachments.push(...data);
}

const archived = new Map(manifest.files.filter((f) => f.ok).map((f) => [f.attachment_id, f]));
const missing = attachments.filter((a) => archived.get(a.id)?.actual_bytes !== Number(a.size_bytes));
if (missing.length) {
  fail(`${missing.length} attachment(s) are not in the verified export, e.g. ${missing[0].storage_path}. Re-export.`);
}

const mb = attachments.reduce((s, a) => s + Number(a.size_bytes), 0) / 1e6;
console.log(`${retired.length} retired applications, ${attachments.length} files, ${mb.toFixed(1)} MB — all present in exports/${label}.`);
if (!confirm) {
  console.log("Dry run. Re-run with --confirm to delete them from Storage.");
  process.exit(0);
}

let removed = 0;
for (let i = 0; i < attachments.length; i += BATCH) {
  const batch = attachments.slice(i, i + BATCH);
  const { error } = await db.storage.from(BUCKET).remove(batch.map((a) => a.storage_path));
  if (error) fail(`storage remove failed after ${removed} files: ${error.message}`);
  const { error: rowErr } = await db.from("attachments").delete().in("id", batch.map((a) => a.id));
  if (rowErr) fail(`deleted objects but not attachments rows (${rowErr.message}); re-run to finish.`);
  removed += batch.length;
  console.log(`  removed ${removed}/${attachments.length}`);
}
console.log(`Done. Freed ~${mb.toFixed(1)} MB.`);
