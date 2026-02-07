
-- FIX: Remove dangerous self-role-insert policy that allows admin self-assignment
DROP POLICY IF EXISTS "Allow self role insert during signup" ON public.user_roles;

-- Replace with a policy that only allows self-insert of non-admin roles
CREATE POLICY "Users can self-assign non-admin role during signup"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role IN ('imobiliaria'::public.app_role, 'tecnico'::public.app_role)
  );
