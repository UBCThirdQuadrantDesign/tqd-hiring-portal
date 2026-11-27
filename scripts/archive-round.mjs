// Export a hiring round to a local archive before its files are purged from
// Supabase Storage (free tier: 1 GB bucket).
//
//   node --env-file=.env.local scripts/archive-round.mjs [label]
//
// Read-only against Supabase. Writes exports/<label>/ (gitignored) containing
// every table row for the round, every résumé/portfolio, and manifest.json
// with a size + sha256 per file. manifest.verified is true only when every
// attachment downloaded and matched its recorded size — purge-round-files.mjs
// refuses to run otherwise.
//
// "The round" = every application not yet retired (retired_at is null, or the
// column doesn't exist yet), i.e. everything currently on the board. Pass
// --retired to export already-retired rows instead.

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BUCKET = "applications"; // must match APPLICATIONS_BUCKET in lib/storage.ts
const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith("--")) ?? "2026-27-round1";
const outDir = path.resolve("exports", label);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY. Run with --env-file=.env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function all(table, query = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(db.from(table).select("*")).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

const safe = (s) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

const applications = (await all("applications")).filter((a) =>
  args.includes("--retired") ? a.retired_at : !a.retired_at
);
const ids = new Set(applications.map((a) => a.id));
const inRound = (r) => ids.has(r.application_id);
const [attachments, notes, stageEvents, reviewers] = await Promise.all([
  all("attachments").then((r) => r.filter(inRound)),
  all("notes").then((r) => r.filter(inRound)),
  all("stage_events").then((r) => r.filter(inRound)),
  all("reviewers"),
]);

console.log(`Exporting ${applications.length} applications, ${attachments.length} files -> ${outDir}`);
await mkdir(path.join(outDir, "files"), { recursive: true });

const reviewerName = new Map(reviewers.map((r) => [r.id, r.name ?? r.email]));
// search_vector is a generated tsvector — noise in an archive.
const stripped = applications.map((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== "search_vector")));
const flatApps = stripped.map(({ answers, ...rest }) => ({
  ...rest,
  ...Object.fromEntries(Object.entries(answers ?? {}).map(([k, v]) => [`answers.${k}`, v])),
}));

await Promise.all([
  writeFile(path.join(outDir, "applications.json"), JSON.stringify(stripped, null, 2)),
  writeFile(path.join(outDir, "applications.csv"), toCsv(flatApps)),
  writeFile(path.join(outDir, "notes.json"), JSON.stringify(notes.map((n) => ({ ...n, author: reviewerName.get(n.author_id) ?? null })), null, 2)),
  writeFile(path.join(outDir, "stage_events.json"), JSON.stringify(stageEvents, null, 2)),
  writeFile(path.join(outDir, "attachments.json"), JSON.stringify(attachments, null, 2)),
  writeFile(path.join(outDir, "reviewers.json"), JSON.stringify(reviewers, null, 2)),
]);

const appName = new Map(applications.map((a) => [a.id, a.full_name]));
const files = [];
let failures = 0;
for (const [i, att] of attachments.entries()) {
  const dir = `${att.application_id}_${safe(appName.get(att.application_id) ?? "unknown")}`;
  const rel = path.posix.join("files", dir, `${att.kind}_${safe(att.filename)}`);
  const entry = { attachment_id: att.id, application_id: att.application_id, storage_path: att.storage_path, file: rel, expected_bytes: att.size_bytes };
  const { data, error } = await db.storage.from(BUCKET).download(att.storage_path);
  if (error || !data) {
    failures++;
    files.push({ ...entry, ok: false, error: error?.message ?? "no data" });
    console.error(`  [${i + 1}/${attachments.length}] FAILED ${att.storage_path}: ${error?.message}`);
    continue;
  }
  const buf = Buffer.from(await data.arrayBuffer());
  await mkdir(path.join(outDir, "files", dir), { recursive: true });
  await writeFile(path.join(outDir, rel), buf);
  const ok = buf.length === Number(att.size_bytes);
  if (!ok) failures++;
  files.push({ ...entry, actual_bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), ok });
  console.log(`  [${i + 1}/${attachments.length}] ${ok ? "ok " : "SIZE MISMATCH"} ${rel} (${(buf.length / 1e6).toFixed(1)} MB)`);
}

const totalBytes = files.reduce((s, f) => s + (f.actual_bytes ?? 0), 0);
const manifest = {
  label,
  exported_at: new Date().toISOString(),
  supabase_project: new URL(url).hostname.split(".")[0],
  counts: { applications: applications.length, attachments: attachments.length, notes: notes.length, stage_events: stageEvents.length },
  total_bytes: totalBytes,
  verified: failures === 0,
  failures,
  files,
};
await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`\n${files.length - failures}/${files.length} files OK, ${(totalBytes / 1e6).toFixed(1)} MB`);
if (failures) {
  console.error(`${failures} file(s) failed — archive is NOT verified. Do not purge.`);
  process.exit(1);
}
console.log(`Verified. Zip it with:  tar -a -cf exports/${label}.zip -C exports ${label}`);
