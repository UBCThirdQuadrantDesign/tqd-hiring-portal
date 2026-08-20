-- Publish `notes` changes over Realtime.
--
-- Same reason as 0005 did for `applications`: the applicant panel
-- (components/application-drawer.tsx) subscribes to postgres_changes on this
-- table, filtered to one application_id, so a note left by one reviewer shows
-- up in another reviewer's open panel without a refresh. Without membership in
-- the supabase_realtime publication the subscription joins and then receives
-- nothing.
--
-- Idempotent for the same reason 0005 is: the table may already be published
-- if it was enabled from the dashboard, and `alter publication ... add table`
-- errors on a duplicate.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;
end
$$;

-- notes_reviewer_read (0001) already restricts selects to is_reviewer(), and
-- Realtime respects RLS, so applicants never receive these broadcasts. Replica
-- identity stays default (primary key) — the panel only needs the id on DELETE.
