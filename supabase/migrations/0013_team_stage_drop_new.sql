-- Retires the "new" column on the review board and adds a "team" stage after
-- offer. Postgres can't cleanly drop an enum value, so 'new' stays in the type
-- but is no longer used: existing rows move to 'reviewing', and new rows (and
-- submit_application) default there instead.
alter type application_stage add value if not exists 'team' after 'offer';

update applications set stage = 'reviewing' where stage = 'new';

alter table applications alter column stage set default 'reviewing';

create or replace function public.submit_application(
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
  from applications where stage = 'reviewing';

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
