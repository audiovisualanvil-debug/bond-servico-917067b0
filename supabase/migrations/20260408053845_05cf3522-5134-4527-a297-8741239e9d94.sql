-- =============================================
-- 1. FIX PROFILES RLS: restrict SELECT
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admins see all
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can see profiles of people they share service orders with
CREATE POLICY "Users can view related profiles via service orders"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE (so.imobiliaria_id = auth.uid() AND so.tecnico_id = profiles.id)
         OR (so.tecnico_id = auth.uid() AND so.imobiliaria_id = profiles.id)
    )
  );

-- =============================================
-- 2. MAKE STORAGE BUCKETS PRIVATE
-- =============================================

UPDATE storage.buckets SET public = false WHERE id IN ('os-photos', 'completion-reports', 'avatars');

-- =============================================
-- 3. DROP OLD PERMISSIVE STORAGE POLICIES
-- =============================================

DROP POLICY IF EXISTS "Public can view os-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view completion-reports" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload os-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload completion-reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;

-- =============================================
-- 4. NEW STORAGE POLICIES WITH OWNERSHIP
-- =============================================

-- AVATARS: users upload/view only their own folder (path: {user_id}/...)
CREATE POLICY "Users upload own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users view own avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- OS-PHOTOS: users upload to own folder, admins and related users can view
CREATE POLICY "Users upload own os-photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'os-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users view own os-photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'os-photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- COMPLETION-REPORTS: same pattern
CREATE POLICY "Users upload own completion-reports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'completion-reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users view own completion-reports"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'completion-reports'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ADMIN: full access to all storage
CREATE POLICY "Admins full access to storage"
  ON storage.objects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. FUNCTION TO CHECK BANNED STATUS
-- =============================================

CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND banned_until IS NOT NULL
      AND banned_until > now()
  )
$$;