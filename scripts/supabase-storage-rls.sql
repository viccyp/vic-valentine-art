-- Run in Supabase Dashboard → SQL → New query.
-- Fixes: "Upload failed: new row violates row-level security policy" on blog image upload.
-- Bucket id must match static/js/config.js STORAGE_BUCKET (default: BLOGS).

-- Public read (required for /object/public/... URLs when RLS is enforced)
DROP POLICY IF EXISTS "Public read blog storage" ON storage.objects;
CREATE POLICY "Public read blog storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'BLOGS');

-- Logged-in admin users can upload
DROP POLICY IF EXISTS "Authenticated insert blog storage" ON storage.objects;
CREATE POLICY "Authenticated insert blog storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'BLOGS');

-- Optional: replace or remove files from the editor / dashboard
DROP POLICY IF EXISTS "Authenticated update blog storage" ON storage.objects;
CREATE POLICY "Authenticated update blog storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'BLOGS')
  WITH CHECK (bucket_id = 'BLOGS');

DROP POLICY IF EXISTS "Authenticated delete blog storage" ON storage.objects;
CREATE POLICY "Authenticated delete blog storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'BLOGS');
