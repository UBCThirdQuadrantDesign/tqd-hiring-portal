-- Lower the `applications` bucket cap from 50MB to 10MB.
--
-- 0002 creates the bucket with `on conflict (id) do nothing`, so editing the
-- limit there only affects a fresh project — an existing bucket keeps the old
-- 50MB. This migration updates it in place.
--
-- Why 10MB: Supabase's free tier gives 1GB of storage and 5GB/month of egress.
-- At the old cap a single applicant could take 60MB (10MB résumé + 50MB
-- portfolio), so ~17 max-size applications would fill the entire tier and
-- uploads would start failing mid-cycle. 10MB across both files puts the
-- realistic ceiling in the hundreds of applications.
--
-- Must stay in sync with `maxSize` on the file questions in
-- content/application.ts, which is what /api/upload-url validates against.

update storage.buckets
set file_size_limit = 10485760
where id = 'applications';
