-- Fix 1: Add restrictive policies on audit_logs to prevent tampering
-- Block all INSERT from regular users (only service_role/edge functions can insert)
CREATE POLICY "Deny direct insert to audit_logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (false);

-- Block all UPDATE
CREATE POLICY "Deny update to audit_logs"
ON public.audit_logs FOR UPDATE TO authenticated
USING (false);

-- Block all DELETE
CREATE POLICY "Deny delete to audit_logs"
ON public.audit_logs FOR DELETE TO authenticated
USING (false);

-- Fix 2: Add SELECT policy for technicians on properties linked to their assigned orders
CREATE POLICY "Tecnicos can view properties linked to assigned orders"
ON public.properties FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.property_id = properties.id AND so.tecnico_id = auth.uid()
  )
);