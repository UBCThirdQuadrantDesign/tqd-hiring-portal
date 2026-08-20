-- Publish `applications` changes over Realtime.
--
-- The review board subscribes to postgres_changes on this table
-- (app/(review)/review/board-store.tsx) so two reviewers triaging at once see
-- each other's stage and star changes. That subscription connects fine but
-- receives nothing unless the table is a member of the supabase_realtime
-- publication, which 0001 never added it to.
--
-- Idempotent: the publication may already list the table if it was enabled
-- from the Supabase dashboard, and `alter publication ... add table` errors
-- on a duplicate.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'applications'
  ) then
    alter publication supabase_realtime add table public.applications;
  end if;
end
$$;

-- Realtime respects RLS, and `applications` is reviewer-only via is_reviewer()
-- (0001), so applicants never receive these broadcasts. Replica identity stays
-- default (primary key) — the board only needs the id on DELETE.
