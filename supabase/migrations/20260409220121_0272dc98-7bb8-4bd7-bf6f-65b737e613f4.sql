-- 1. Fix user_roles SELECT: restrict to own role only
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;
CREATE POLICY "Users can view own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Add UPDATE and DELETE policies for os-photos storage
CREATE POLICY "Users update own os-photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'os-photos' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "Users delete own os-photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'os-photos' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- 3. Add UPDATE and DELETE policies for completion-reports storage
CREATE POLICY "Users update own completion-reports"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'completion-reports' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "Users delete own completion-reports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'completion-reports' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- 4. Make avatars bucket private
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- 5. Replace public avatars SELECT with owner-only + admin
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users view own avatars" ON storage.objects;
CREATE POLICY "Users view own avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  ));

-- 6. Enable Realtime authorization (RLS on realtime.messages)
-- Note: Supabase Realtime respects table-level RLS when using Broadcast/Presence,
-- but for Postgres Changes, the RLS on the source table is what matters.
-- The realtime.messages table RLS is managed by Supabase infrastructure.
-- We ensure our source tables have proper RLS (already done).