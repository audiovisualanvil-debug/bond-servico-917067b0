-- 1. Harden admin role management: add explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Allow imobiliarias to update their own service orders
CREATE POLICY "Imobiliarias update own orders"
  ON public.service_orders
  FOR UPDATE
  TO authenticated
  USING (imobiliaria_id = auth.uid());

-- 3. Fix os-photos SELECT: allow cross-party access for same service order
DROP POLICY IF EXISTS "Users view own os-photos" ON storage.objects;
CREATE POLICY "Users view os-photos for accessible orders"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'os-photos'
    AND (
      -- Own photos
      auth.uid()::text = (storage.foldername(name))[1]
      -- Admin access
      OR has_role(auth.uid(), 'admin'::app_role)
      -- Cross-party: tecnico or imobiliaria on same service order
      OR EXISTS (
        SELECT 1 FROM public.service_orders so
        WHERE (so.tecnico_id = auth.uid() OR so.imobiliaria_id = auth.uid())
          AND (so.tecnico_id::text = (storage.foldername(name))[1] OR so.imobiliaria_id::text = (storage.foldername(name))[1])
      )
    )
  );