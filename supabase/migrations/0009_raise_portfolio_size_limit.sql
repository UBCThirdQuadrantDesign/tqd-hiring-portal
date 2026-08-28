-- Raise the `applications` bucket cap from 10MB to 20MB for portfolios.
--
-- Supersedes 0004. Same reason that migration exists: 0002 creates the bucket
-- with `on conflict (id) do nothing`, so editing the limit there only affects a
-- fresh project — an existing bucket keeps the old value. Any future change to
-- this cap needs another `update storage.buckets`, not an edit to 0002.
--
-- Why 20MB: design and architecture portfolios are the submissions that
-- actually hit 10MB, so the old cap was turning away legitimate applications.
-- The free tier gives 1GB of storage and 5GB/month of egress. Worst case per
-- applicant goes from 20MB (10 résumé + 10 portfolio) to 30MB, which drops the
-- max-size ceiling from ~53 applicants to ~35. That ceiling is not the real
-- constraint at the expected volume of <100 applications: what matters is the
-- average, and 1GB across 100 applicants allows ~10.7MB combined per applicant.
-- Résumés run well under 1MB and the portfolio is optional, so the realistic
-- average is 4-7MB even with a 20MB ceiling.
--
-- Egress is the quieter limit — reviewer previews download the full file every
-- time (app/api/reviewer/attachment/[id]) with no thumbnails or caching. At
-- ~100 applications that is roughly 1-2GB of the 5GB monthly allowance, and it
-- is the number that would break first if volume doubled.
--
-- Note: file_size_limit is per-BUCKET, not per-field. This 20MB therefore
-- becomes the hard cap for the résumé too; the résumé's 10MB is enforced only
-- at /api/upload-url, which trusts the client-reported size. A crafted request
-- could put a 20MB résumé in the bucket. Accepted trade for this portal.
--
-- Must stay in sync with `maxSize` on the file questions in
-- content/application.ts, which is what /api/upload-url validates against.

update storage.buckets
set file_size_limit = 20971520 -- 20 MiB, >= the 20_000_000 portfolio cap
where id = 'applications';
