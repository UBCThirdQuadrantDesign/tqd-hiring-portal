-- Email-keyed reviewer allowlist.
--
-- `reviewers.id` is a FK to auth.users, so a reviewer row cannot exist until
-- that person has signed in at least once — but the OAuth callback refuses
-- anyone without a reviewer row. Chicken-and-egg. The previous workaround was
-- to invite each reviewer by email from the dashboard so the auth.users row
-- existed first, which is fragile: Google only auto-links a new identity onto
-- an existing user when that user's email is already confirmed, so an
-- unaccepted invite silently produces a second orphan account with a
-- different uid.
--
-- Instead, keep the allowlist on the one identifier that is stable before
-- signup: the email address. The callback provisions the `reviewers` row on
-- first successful sign-in. Adding a teammate is now one insert here.

create table reviewer_allowlist (
  email    text primary key,
  role     text not null default 'reviewer' check (role in ('reviewer', 'admin')),
  added_at timestamptz not null default now(),
  constraint reviewer_allowlist_email_lowercase check (email = lower(email))
);

-- RLS on with zero policies: this table is readable only by the secret key,
-- which bypasses RLS. Reviewers have no reason to read it (the roster they
-- actually need is `reviewers`, covered by reviewers_team_read), and the
-- anon role must never enumerate staff emails.
alter table reviewer_allowlist enable row level security;

insert into reviewer_allowlist (email, role) values
  ('matthewcflam@gmail.com',        'admin'),
  ('ubcthirdquadrantdesign@gmail.com', 'admin'),
  ('spencersun52@gmail.com',        'reviewer'),
  ('juna.hassan6@gmail.com',        'reviewer'),
  ('negar.fathiheris@gmail.com',    'reviewer')
on conflict (email) do nothing;
