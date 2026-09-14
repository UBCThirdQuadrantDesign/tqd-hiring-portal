-- Tracks whether an interview invite has been sent (toggled on Interview column cards).
alter table applications add column if not exists interview_sent boolean not null default false;
