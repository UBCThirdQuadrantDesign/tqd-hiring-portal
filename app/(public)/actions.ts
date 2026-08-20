"use server";

import { applicationFormSchema, answerValuesSchema } from "@/lib/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { APPLICATIONS_BUCKET } from "@/lib/storage";

export type SubmitState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  submittedName?: string;
};

/**
 * Public submission Server Action. Uses the service-role key deliberately
 * — there is no anon INSERT policy on `applications` (an enumerable,
 * spammable table is how you get that). This is the only place anon
 * traffic is allowed to create a row, and it validates, honeypot-checks,
 * and normalizes first.
 */
export async function submitApplication(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const raw = Object.fromEntries(formData.entries());

  const parsed = applicationFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, error: "Check the highlighted fields.", fieldErrors };
  }

  // Honeypot: a real applicant never sees or fills `company`.
  if (parsed.data.company) {
    return { ok: false, error: "Submission rejected." };
  }

  const { full_name, email, faculty, year, subteam, resume_path, portfolio_path } =
    parsed.data;
  const answers = answerValuesSchema.parse(parsed.data);

  const admin = createAdminClient();

  // Fractional-index position: append to the end of the "new" column.
  const { data: maxRow } = await admin
    .from("applications")
    .select("position")
    .eq("stage", "new")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (maxRow?.position ?? 0) + 1;

  const { data: inserted, error: insertError } = await admin
    .from("applications")
    .insert({
      full_name,
      email,
      faculty,
      year,
      subteam,
      answers,
      position,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: "Something went wrong submitting. Try again." };
  }

  const attachments = [
    { kind: "resume", path: resume_path },
    { kind: "portfolio", path: portfolio_path },
  ];

  for (const { kind, path } of attachments) {
    const { data: fileInfo } = await admin.storage
      .from(APPLICATIONS_BUCKET)
      .list(path.split("/")[0], { search: path.split("/").slice(1).join("/") });
    const found = fileInfo?.[0];

    await admin.from("attachments").insert({
      application_id: inserted.id,
      kind,
      storage_path: path,
      filename: found?.name ?? path.split("/").pop() ?? kind,
      size_bytes: found?.metadata?.size ?? 0,
      mime_type: found?.metadata?.mimetype ?? "application/octet-stream",
    });
  }

  return { ok: true, submittedName: full_name };
}
