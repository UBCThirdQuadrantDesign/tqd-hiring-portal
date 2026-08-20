"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { noteSchema, applicationStages, type ApplicationStage } from "@/lib/schema";
import { APPLICATIONS_BUCKET, SIGNED_URL_TTL_SECONDS } from "@/lib/storage";

/** All actions run as the signed-in reviewer — RLS (is_reviewer()) is the real gate, not this file. */

export async function setStage(applicationId: string, stage: ApplicationStage) {
  if (!applicationStages.includes(stage)) throw new Error("Invalid stage.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ stage })
    .eq("id", applicationId);
  if (error) throw error;
  revalidatePath("/review");
}

export async function reorder(applicationId: string, stage: ApplicationStage, position: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ stage, position })
    .eq("id", applicationId);
  if (error) throw error;
  revalidatePath("/review");
}

export async function toggleStar(applicationId: string, starred: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ starred })
    .eq("id", applicationId);
  if (error) throw error;
  revalidatePath("/review");
}

export async function addNote(applicationId: string, body: string) {
  const parsed = noteSchema.parse({ application_id: applicationId, body });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { error } = await supabase.from("notes").insert({
    application_id: parsed.application_id,
    author_id: user.id,
    body: parsed.body,
  });
  if (error) throw error;
  revalidatePath("/review");
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;
  revalidatePath("/review");
}

export async function getApplicationDetail(applicationId: string) {
  const supabase = await createClient();

  const [
    { data: applicationRow, error: appError },
    { data: attachments },
    { data: notes },
    { data: reviewers },
  ] = await Promise.all([
    supabase.from("applications").select("*").eq("id", applicationId).single(),
    supabase.from("attachments").select("*").eq("application_id", applicationId),
    supabase
      .from("notes")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true }),
    // notes.author_id and reviewers.id both reference auth.users, but there's
    // no direct FK between the two tables for PostgREST to embed — resolve
    // author names with a small lookup instead.
    supabase.from("reviewers").select("id, name, email"),
  ]);

  const reviewerById = new Map((reviewers ?? []).map((r) => [r.id, r]));
  const notesWithAuthor = (notes ?? []).map((n) => ({
    ...n,
    author_name: reviewerById.get(n.author_id)?.name ?? reviewerById.get(n.author_id)?.email ?? "Reviewer",
  }));

  if (appError || !applicationRow) throw appError ?? new Error("Not found.");

  // The reviewer's own session has no Storage RLS policy — signed URLs are
  // minted with the service-role key. The DB reads above already went
  // through is_reviewer(), so by this point the caller is confirmed.
  const adminStorage = createAdminClient().storage.from(APPLICATIONS_BUCKET);
  const signedAttachments = await Promise.all(
    (attachments ?? []).map(async (a) => {
      const { data } = await adminStorage.createSignedUrl(a.storage_path, SIGNED_URL_TTL_SECONDS);
      return { ...a, signedUrl: data?.signedUrl ?? null };
    })
  );

  return {
    application: applicationRow,
    attachments: signedAttachments,
    notes: notesWithAuthor,
  };
}
