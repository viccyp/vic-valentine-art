-- Run in Supabase Dashboard → SQL → New query.
-- Fixes: "Upload failed: new row violates row-level security policy" on image upload.
-- Bucket id must match SUPABASE_STORAGE_BUCKET in .env (currently: ART).

-- Public read (required for /object/public/... URLs when RLS is enforced)
DROP POLICY IF EXISTS "Public read art storage" ON storage.objects;
CREATE POLICY "Public read art storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ART');

-- Logged-in admin users can upload
DROP POLICY IF EXISTS "Authenticated insert art storage" ON storage.objects;
CREATE POLICY "Authenticated insert art storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ART');

-- Optional: replace or remove files from the editor / dashboard
DROP POLICY IF EXISTS "Authenticated update art storage" ON storage.objects;
CREATE POLICY "Authenticated update art storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'ART')
  WITH CHECK (bucket_id = 'ART');

DROP POLICY IF EXISTS "Authenticated delete art storage" ON storage.objects;
CREATE POLICY "Authenticated delete art storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'ART');
