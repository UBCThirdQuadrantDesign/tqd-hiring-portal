-- TQD Hiring Portal — initial schema + RLS
-- See tqd-hiring-portal-build-plan.md and the plan that supersedes it.

create extension if not exists "pgcrypto";

create type application_stage as enum
  ('new', 'reviewing', 'interview', 'offer', 'archived');

create table applications (
  id            uuid primary key default gen_random_uuid(),
  cycle         text not null default '2026-27',
  full_name     text not null,
  email         text not null,
  faculty       text not null,
  year          text not null,
  subteam       text not null,
  answers       jsonb not null default '{}'::jsonb, -- why_join, hours_per_week, other_commitments
  stage         application_stage not null default 'new',
  starred       boolean not null default false,
  position      numeric not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table applications
  add column search_vector tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(full_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(faculty, '') || ' ' ||
      coalesce(subteam, '') || ' ' ||
      coalesce(answers->>'why_join', '') || ' ' ||
      coalesce(answers->>'other_commitments', '')
    )
  ) stored;

create index applications_search_idx on applications using gin (search_vector);
create index applications_stage_idx on applications (stage);
create index applications_position_idx on applications (stage, position);

create table attachments (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  kind           text not null check (kind in ('resume', 'portfolio')),
  storage_path   text not null,
  filename       text not null,
  size_bytes     bigint not null,
  mime_type      text not null,
  created_at     timestamptz not null default now()
);

create index attachments_application_idx on attachments (application_id);

create table reviewers (
  id        uuid primary key references auth.users on delete cascade,
  email     text not null unique,
  name      text,
  role      text not null default 'reviewer' check (role in ('reviewer', 'admin')),
  active    boolean not null default true
);

create table notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  author_id      uuid not null references auth.users,
  body           text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index notes_application_idx on notes (application_id);

create table stage_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  from_stage     application_stage,
  to_stage       application_stage not null,
  actor_id       uuid references auth.users,
  created_at     timestamptz not null default now()
);

create index stage_events_application_idx on stage_events (application_id);

-- updated_at maintenance -----------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_set_updated_at
  before update on applications
  for each row execute function set_updated_at();

create trigger notes_set_updated_at
  before update on notes
  for each row execute function set_updated_at();

-- stage_events audit trail ----------------------------------------------

create or replace function log_stage_event() returns trigger
language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') or (old.stage is distinct from new.stage) then
    insert into stage_events (application_id, from_stage, to_stage, actor_id)
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.stage end,
      new.stage,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger applications_log_stage_event
  after insert or update of stage on applications
  for each row execute function log_stage_event();

-- Access control ----------------------------------------------------------

create or replace function is_reviewer() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from reviewers
    where id = auth.uid() and active = true
  );
$$;

alter table applications enable row level security;
alter table attachments enable row level security;
alter table notes enable row level security;
alter table stage_events enable row level security;
alter table reviewers enable row level security;

-- applications: no anon policy at all. Public submission goes through a
-- Server Action using the service-role key, which bypasses RLS by design.
create policy applications_reviewer_all on applications
  for all using (is_reviewer()) with check (is_reviewer());

create policy attachments_reviewer_read on attachments
  for select using (is_reviewer());

create policy notes_reviewer_read on notes
  for select using (is_reviewer());

create policy notes_author_write on notes
  for insert with check (is_reviewer() and author_id = auth.uid());

create policy notes_author_update on notes
  for update using (is_reviewer() and author_id = auth.uid())
  with check (is_reviewer() and author_id = auth.uid());

create policy notes_author_delete on notes
  for delete using (is_reviewer() and author_id = auth.uid());

create policy stage_events_reviewer_read on stage_events
  for select using (is_reviewer());
-- inserts happen only via the log_stage_event() trigger (security definer)

-- Any active reviewer can read the reviewer roster (name/email only, no
-- secrets live here) — needed to attribute notes to a name rather than a
-- bare UUID and to show presence. Deliberately broader than "own row
-- only": this is a 3-8 person internal team, not a multi-tenant system.
create policy reviewers_team_read on reviewers
  for select using (is_reviewer());

-- Storage -------------------------------------------------------------
-- Bucket `applications` is created separately (private, no public policy).
-- All access — applicant upload and reviewer download — goes through
-- short-lived signed URLs minted server-side with the service role key.
