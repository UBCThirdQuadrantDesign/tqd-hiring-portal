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

  // Verify each uploaded object actually exists before writing anything —
  // `resume_path` / `portfolio_path` are otherwise trusted client input.
  // The portfolio is optional, so an empty path just means no attachment.
  const attachmentInputs = [
    { kind: "resume", path: resume_path, field: "resume_path" },
    ...(portfolio_path
      ? [{ kind: "portfolio", path: portfolio_path, field: "portfolio_path" }]
      : []),
  ];

  const attachments: {
    kind: string;
    storage_path: string;
    filename: string;
    size_bytes: number;
    mime_type: string;
  }[] = [];

  for (const { kind, path, field } of attachmentInputs) {
    const { data: info, error } = await admin.storage
      .from(APPLICATIONS_BUCKET)
      .info(path);

    if (error || !info) {
      return {
        ok: false,
        error: "Check the highlighted fields.",
        fieldErrors: { [field]: "This file could not be found. Please re-upload it." },
      };
    }

    attachments.push({
      kind,
      storage_path: path,
      filename: path.split("/").pop() ?? kind,
      size_bytes: info.size ?? 0,
      mime_type: info.contentType ?? "application/octet-stream",
    });
  }

  const { data: newId, error: rpcError } = await admin.rpc("submit_application", {
    p_full_name: full_name,
    p_email: email,
    p_faculty: faculty,
    p_year: year,
    p_subteam: subteam,
    p_answers: answers,
    p_attachments: attachments,
  });

  if (rpcError || !newId) {
    console.error("[submit-application] rpc failed", rpcError);
    return { ok: false, error: "Something went wrong submitting. Try again." };
  }

  return { ok: true, submittedName: full_name };
}
