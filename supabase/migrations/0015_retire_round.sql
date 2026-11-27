-- Retire a finished hiring round so the next one starts on an empty board.
--
-- The cycle label stays "2026-27" for the second intake, so `cycle` can't tell
-- rounds apart. `retired_at` does: the board (app/(review)/review/layout.tsx,
-- board-store.tsx) only shows rows where it is null. Retired rows stay in the
-- table for history; they're a few KB each and the 500 MB DB quota is separate
-- from the 1 GB Storage quota that the files count against.
--
-- Retiring is not deletion. The round's résumés/portfolios are removed from
-- Storage separately by scripts/purge-round-files.mjs, and only after
-- scripts/archive-round.mjs has written a verified local export.
--
-- Run this only after that export exists: the update below retires every
-- application currently in the table. To retire a future round, re-run just
-- the update.

alter table applications add column if not exists retired_at timestamptz;

create index if not exists applications_active_position_idx
  on applications (stage, position) where retired_at is null;

update applications set retired_at = now() where retired_at is null;

notify pgrst, 'reload schema';
