-- Atomic application submission.
--
-- Today (app/(public)/actions.ts) the `applications` row is inserted, then
-- attachments are inserted in a loop whose result is discarded. A failed
-- attachment insert leaves a half-written application that looks successful
-- to both the applicant and reviewers. This RPC writes the application and
-- both attachments in one transaction: either the whole submission lands, or
-- none of it does.
--
-- security definer because anon has no INSERT policy on `applications` or
-- `attachments` (migration 0001, deliberately — an enumerable, spammable
-- insert path is exactly what that avoids). Only service_role may call this,
-- same trust boundary as today's Server Action already relies on.
--
-- The advisory lock replaces the app's previous read-then-write `position`
-- race (select max(position), then insert) with a single serialized step,
-- and removes a round trip. It is transaction-scoped (`_xact_`), so it
-- releases automatically on commit or rollback.
--
-- Not lowercasing `p_email` here — normalization belongs with a
-- `unique (lower(email), cycle)` index, a separate concern.
--
-- The existing `log_stage_event()` trigger still fires on insert with a
-- null `auth.uid()` under service_role — unchanged from today.

create function public.submit_application(
  p_full_name   text,
  p_email       text,
  p_faculty     text,
  p_year        text,
  p_subteam     text,
  p_answers     jsonb,
  p_attachments jsonb   -- [{kind, storage_path, filename, size_bytes, mime_type}]
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  new_id uuid;
  next_position numeric;
begin
  perform pg_advisory_xact_lock(hashtext('applications_position_new'));

  select coalesce(max(position), 0) + 1 into next_position
  from applications where stage = 'new';

  insert into applications (full_name, email, faculty, year, subteam, answers, position)
  values (p_full_name, p_email, p_faculty, p_year, p_subteam, p_answers, next_position)
  returning id into new_id;

  insert into attachments (application_id, kind, storage_path, filename, size_bytes, mime_type)
  select new_id, x.kind, x.storage_path, x.filename, x.size_bytes, x.mime_type
  from jsonb_to_recordset(p_attachments)
    as x(kind text, storage_path text, filename text, size_bytes bigint, mime_type text);

  return new_id;
end $$;

revoke all on function public.submit_application(text,text,text,text,text,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_application(text,text,text,text,text,jsonb,jsonb)
  to service_role;
notify pgrst, 'reload schema';
