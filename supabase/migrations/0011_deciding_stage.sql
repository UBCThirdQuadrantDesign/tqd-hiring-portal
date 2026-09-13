-- Adds a "deciding" stage between interview and offer on the review board.
alter type application_stage add value if not exists 'deciding' after 'interview';
