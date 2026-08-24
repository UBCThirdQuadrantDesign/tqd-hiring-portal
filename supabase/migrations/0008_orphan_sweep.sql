-- Lists uploaded objects with no referencing `attachments` row, older than a
-- grace period. Uploads fire on file-select (lib/use-file-upload.ts), not on
-- submit, so every abandoned form, replaced file, or failed validation leaves
-- an object at `${draftId}/${name}` that nothing ever references or cleans
-- up. Supabase Storage has no lifecycle rules, so these accumulate forever;
-- on the free tier's 1 GB bucket that is a slow, guaranteed outage.
--
-- security definer + `search_path ... storage` because PostgREST only
-- exposes the `public` schema — `storage.objects` isn't queryable from
-- supabase-js directly. This function only lists candidates; deleting
-- `storage.objects` rows directly would orphan the underlying bytes, so
-- removal must go through the Storage API (see app/api/cron/sweep-orphans).
--
-- 48h default grace period: draftId is generated fresh per form mount and
-- never persisted (see apply-form.tsx), so an upload can't be "still in
-- progress" for anywhere near that long — a page reload alone requires
-- re-uploading.
--
-- Side effect: `attachments` cascades on application delete, so a deleted
-- application's files become orphans here too and get swept automatically.

create function public.list_orphaned_uploads(older_than interval default interval '48 hours')
returns table (name text, size_bytes bigint, created_at timestamptz)
language sql security definer set search_path = public, storage
as $$
  select o.name,
         coalesce((o.metadata->>'size')::bigint, 0),
         o.created_at
  from storage.objects o
  left join public.attachments a on a.storage_path = o.name
  where o.bucket_id = 'applications'
    and a.id is null
    and o.created_at < now() - older_than
  order by o.created_at
$$;

revoke all on function public.list_orphaned_uploads(interval) from public, anon, authenticated;
grant execute on function public.list_orphaned_uploads(interval) to service_role;
notify pgrst, 'reload schema';
