-- Storage bucket for résumé / portfolio uploads.
--
-- Split out of 0001 because Supabase's SQL editor runs as a role that can
-- insert into storage.buckets, but the bucket is not part of the public
-- schema and is easy to forget when standing up a fresh project. Forgetting
-- it fails in a confusing way: createSignedUploadUrl() returns "Bucket not
-- found", /api/upload-url turns that into a generic 500, and the applicant
-- sees an upload that never starts.
--
-- Private. Every read and write goes through a short-lived signed URL minted
-- server-side with the secret key, so there are deliberately no storage RLS
-- policies for anon or authenticated roles.
--
-- The id must match APPLICATIONS_BUCKET in lib/storage.ts exactly — bucket
-- names are case-sensitive.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'applications',
  'applications',
  false,
  10485760, -- 10MB, matching both per-question caps in content/application.ts
  array['application/pdf', 'image/png']
)
on conflict (id) do nothing;
