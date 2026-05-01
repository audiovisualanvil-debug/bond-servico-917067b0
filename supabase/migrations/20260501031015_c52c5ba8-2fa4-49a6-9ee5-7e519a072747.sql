-- 1. Tighten function execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 2. Consolidate RLS for profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- 3. Audit table security
-- Audit logs should be read-only for admins and invisible to others
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 4. Completion reports storage security (secondary bucket)
DROP POLICY IF EXISTS "Users view own completion-reports" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own completion-reports" ON storage.objects;
DROP POLICY IF EXISTS "Imobiliarias can view completion report files" ON storage.objects;

CREATE POLICY "Secure view completion-reports" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'completion-reports' AND (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id::text = (storage.foldername(name))[1]
      AND (so.tecnico_id = auth.uid() OR so.imobiliaria_id = auth.uid())
    )
  )
);

CREATE POLICY "Secure upload completion-reports" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'completion-reports' AND 
  EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id::text = (storage.foldername(name))[1]
    AND (so.tecnico_id = auth.uid()) -- Only technicians upload reports
  )
);
