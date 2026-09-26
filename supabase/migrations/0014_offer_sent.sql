-- Tracks whether an offer has been sent (toggled on Offer column cards).
alter table applications add column if not exists offer_sent boolean not null default false;
