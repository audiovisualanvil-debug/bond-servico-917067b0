-- 1. Realtime security
-- Ensure all tables have RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_comments ENABLE ROW LEVEL SECURITY;

-- 2. Prevent role self-assignment and escalation
-- Drop restrictive policies to replace with a definitive admin-only management policy
DROP POLICY IF EXISTS "Users can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Ensure ONLY admins can manage (INSERT/UPDATE/DELETE) roles. 
-- Users can only SELECT their own via the existing "Users can view own role" policy.
CREATE POLICY "Admins full access on user_roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Storage Security - Linking files to OS instead of just folder names
-- os-photos bucket policies
DROP POLICY IF EXISTS "Users view os-photos for accessible orders" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own os-photos" ON storage.objects;

-- SELECT policy: Admin or user linked to the OS.
-- Expected path format: os-id/filename.extension
CREATE POLICY "Secure view os-photos" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'os-photos' AND (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id::text = (storage.foldername(name))[1]
      AND (so.tecnico_id = auth.uid() OR so.imobiliaria_id = auth.uid())
    )
  )
);

-- INSERT policy: technician or requester linked to the OS
CREATE POLICY "Secure upload os-photos" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'os-photos' AND 
  EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id::text = (storage.foldername(name))[1]
    AND (so.tecnico_id = auth.uid() OR so.imobiliaria_id = auth.uid())
  )
);

-- 4. Fix SECURITY DEFINER functions compliance
-- Set secure search_path for all public security definer functions
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public, pg_catalog;
ALTER FUNCTION public.is_user_banned(uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.generate_os_number() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;

-- Revoke default PUBLIC execution from sensitive functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.generate_os_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_os_number() TO authenticated, service_role;
