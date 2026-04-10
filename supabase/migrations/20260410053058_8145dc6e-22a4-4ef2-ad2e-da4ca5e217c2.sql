
-- 1. Drop the old permissive INSERT policy that could allow self-assignment
DROP POLICY IF EXISTS "Users cannot self assign roles" ON public.user_roles;

-- 2. Recreate as RESTRICTIVE — always enforced regardless of other permissive policies
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add explicit RESTRICTIVE UPDATE policy to prevent non-admin escalation
CREATE POLICY "Only admins can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add explicit RESTRICTIVE DELETE policy
CREATE POLICY "Only admins can delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
