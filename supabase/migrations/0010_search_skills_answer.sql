-- Include the new `skills` answer (added to content/application.ts) in the
-- reviewer full-text search. A generated column's expression cannot be
-- altered in place, so the column and its index are dropped and rebuilt.

drop index if exists applications_search_idx;

alter table applications drop column search_vector;

alter table applications
  add column search_vector tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(full_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(faculty, '') || ' ' ||
      coalesce(subteam, '') || ' ' ||
      coalesce(answers->>'why_join', '') || ' ' ||
      coalesce(answers->>'skills', '') || ' ' ||
      coalesce(answers->>'other_commitments', '')
    )
  ) stored;

create index applications_search_idx on applications using gin (search_vector);
