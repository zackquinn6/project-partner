-- Admin catalog (tools / materials) photos use catalog row UUIDs, not user_tools / user_materials
-- row ids. Existing library-photos policies typically require the filename stem to match an owned
-- library row, which blocks LibraryItemForm uploads. Allow a dedicated prefix under the uploader's folder.

CREATE POLICY "library_photos_core_tool_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'library-photos'
  AND split_part(name, '/', 1) = (auth.uid())::text
  AND (
    split_part(name, '/', 2) LIKE 'core-tool-%'
    OR split_part(name, '/', 2) LIKE 'core-material-%'
  )
);

CREATE POLICY "library_photos_core_tool_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'library-photos'
  AND split_part(name, '/', 1) = (auth.uid())::text
  AND (
    split_part(name, '/', 2) LIKE 'core-tool-%'
    OR split_part(name, '/', 2) LIKE 'core-material-%'
  )
);

CREATE POLICY "library_photos_core_tool_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'library-photos'
  AND split_part(name, '/', 1) = (auth.uid())::text
  AND (
    split_part(name, '/', 2) LIKE 'core-tool-%'
    OR split_part(name, '/', 2) LIKE 'core-material-%'
  )
);
