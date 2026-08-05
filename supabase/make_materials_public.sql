-- ==============================================================================
-- Make materials storage bucket public and update RLS read policy
-- ==============================================================================

UPDATE storage.buckets
SET public = true
WHERE id = 'materials';

DROP POLICY IF EXISTS "Public read access for public buckets" ON storage.objects;
CREATE POLICY "Public read access for public buckets" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'marketplace', 'events', 'materials'));
