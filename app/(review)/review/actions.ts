"use server";

import { createClient } from "@/lib/supabase/server";
import { noteSchema, applicationStages, type ApplicationStage } from "@/lib/schema";

/** All actions run as the signed-in reviewer — RLS (is_reviewer()) is the real gate, not this file. */

/* No mutation here calls revalidatePath: /review is dynamic (cookie-backed
   Supabase client), so nothing is cached that needs invalidating, and the
   client applies every one of these optimistically and then reconciles over
   Realtime — the board via board-store.tsx, notes via the panel's own notes
   channel. Revalidating only forced an RSC refetch of the board and the open
   applicant panel on every click. */

export async function setStage(applicationId: string, stage: ApplicationStage) {
  if (!applicationStages.includes(stage)) throw new Error("Invalid stage.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ stage })
    .eq("id", applicationId);
  if (error) throw error;
}

export async function reorder(applicationId: string, stage: ApplicationStage, position: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ stage, position })
    .eq("id", applicationId);
  if (error) throw error;
}

export async function toggleStar(applicationId: string, starred: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ starred })
    .eq("id", applicationId);
  if (error) throw error;
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
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;
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

  // Attachments come back unsigned on purpose. Minting signed URLs here
  // meant a second serial round trip to Storage on every panel open (the
  // paths aren't known until the query above returns), and the 60s TTL
  // started ticking while the reviewer was still reading. The panel links
  // to /api/reviewer/attachment/[id], which signs on click instead.
  return {
    application: applicationRow,
    attachments: attachments ?? [],
    notes: notesWithAuthor,
  };
}
