
-- Admin needs to be able to insert properties on behalf of imobiliárias
-- Check if policy already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin can insert properties' AND tablename = 'properties'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin can insert properties" ON public.properties FOR INSERT WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;
