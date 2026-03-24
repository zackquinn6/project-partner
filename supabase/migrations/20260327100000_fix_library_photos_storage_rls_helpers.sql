-- Fix library-photos RLS for catalog tool/material uploads (LibraryItemForm).
-- Prefer storage.foldername / storage.filename (Supabase docs) over split_part(name, '/').
-- UPDATE needs WITH CHECK so upsert/overwrites are allowed after INSERT policies pass.

DROP POLICY IF EXISTS "library_photos_core_tool_select" ON storage.objects;
DROP POLICY IF EXISTS "library_photos_core_tool_insert" ON storage.objects;
DROP POLICY IF EXISTS "library_photos_core_tool_update" ON storage.objects;
DROP POLICY IF EXISTS "library_photos_core_tool_delete" ON storage.objects;

-- Upsert / existence checks may read object metadata under the same RLS rules.
CREATE POLICY "library_photos_core_tool_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'library-photos'
  AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  AND (
    storage.filename(name) LIKE 'core-tool-%'
    OR storage.filename(name) LIKE 'core-material-%'
  )
);

CREATE POLICY "library_photos_core_tool_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'library-photos'
  AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  AND (
    storage.filename(name) LIKE 'core-tool-%'
    OR storage.filename(name) LIKE 'core-material-%'
  )
);

CREATE POLICY "library_photos_core_tool_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'library-photos'
  AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  AND (
    storage.filename(name) LIKE 'core-tool-%'
    OR storage.filename(name) LIKE 'core-material-%'
  )
)
WITH CHECK (
  bucket_id = 'library-photos'
  AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  AND (
    storage.filename(name) LIKE 'core-tool-%'
    OR storage.filename(name) LIKE 'core-material-%'
  )
);

CREATE POLICY "library_photos_core_tool_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'library-photos'
  AND (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  AND (
    storage.filename(name) LIKE 'core-tool-%'
    OR storage.filename(name) LIKE 'core-material-%'
  )
);
