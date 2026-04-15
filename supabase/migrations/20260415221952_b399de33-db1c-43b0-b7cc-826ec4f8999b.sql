-- Fix 1: Set properties_limited view to SECURITY INVOKER
ALTER VIEW public.properties_limited SET (security_invoker = on);

-- Fix 2: Restrict has_role to prevent role enumeration by non-admins
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _user_id = auth.uid()  -- Users can check their own roles
        OR EXISTS (             -- Admins can check anyone's roles
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
  )
$$;