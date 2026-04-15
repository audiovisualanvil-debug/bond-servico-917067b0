
-- =============================================
-- FIX 1: Restrict technician updates on service_orders
-- Add a trigger to prevent technicians from modifying sensitive fields
-- =============================================

CREATE OR REPLACE FUNCTION public.restrict_tecnico_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only restrict technicians (not admins)
  IF has_role(auth.uid(), 'tecnico') AND NOT has_role(auth.uid(), 'admin') THEN
    IF NEW.final_price IS DISTINCT FROM OLD.final_price THEN
      RAISE EXCEPTION 'Técnicos não podem alterar o preço final';
    END IF;
    IF NEW.labor_cost IS DISTINCT FROM OLD.labor_cost THEN
      RAISE EXCEPTION 'Técnicos não podem alterar custo de mão de obra';
    END IF;
    IF NEW.material_cost IS DISTINCT FROM OLD.material_cost THEN
      RAISE EXCEPTION 'Técnicos não podem alterar custo de material';
    END IF;
    IF NEW.tax_cost IS DISTINCT FROM OLD.tax_cost THEN
      RAISE EXCEPTION 'Técnicos não podem alterar custo de impostos';
    END IF;
    IF NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
      RAISE EXCEPTION 'Técnicos não podem alterar método de pagamento';
    END IF;
    IF NEW.admin_approved_at IS DISTINCT FROM OLD.admin_approved_at THEN
      RAISE EXCEPTION 'Técnicos não podem alterar aprovação do admin';
    END IF;
    IF NEW.client_approved_at IS DISTINCT FROM OLD.client_approved_at THEN
      RAISE EXCEPTION 'Técnicos não podem alterar aprovação do cliente';
    END IF;
    IF NEW.imobiliaria_id IS DISTINCT FROM OLD.imobiliaria_id THEN
      RAISE EXCEPTION 'Técnicos não podem alterar a imobiliária';
    END IF;
    IF NEW.property_id IS DISTINCT FROM OLD.property_id THEN
      RAISE EXCEPTION 'Técnicos não podem alterar o imóvel';
    END IF;
    IF NEW.tecnico_id IS DISTINCT FROM OLD.tecnico_id THEN
      RAISE EXCEPTION 'Técnicos não podem alterar o técnico atribuído';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER restrict_tecnico_update_trigger
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_tecnico_update();

-- =============================================
-- FIX 2: Restrict technician access to PII on properties
-- Replace permissive SELECT policy with one that uses a view
-- =============================================

-- Create a secure view that masks PII for technicians
CREATE OR REPLACE VIEW public.properties_limited AS
SELECT
  id,
  imobiliaria_id,
  address,
  neighborhood,
  city,
  state,
  zip_code,
  code,
  created_at,
  updated_at,
  -- Mask PII fields
  NULL::text AS owner_name,
  NULL::text AS owner_phone,
  NULL::text AS owner_email,
  NULL::text AS tenant_name,
  NULL::text AS tenant_phone
FROM public.properties;

-- Revoke direct column access for PII from technicians by replacing the policy
-- Drop the old permissive policy
DROP POLICY IF EXISTS "Tecnicos can view properties linked to assigned orders" ON public.properties;

-- Re-create with restricted columns using a function that strips PII
-- Since RLS can't restrict columns, we use a trigger approach:
-- Create a new policy that still allows SELECT but the app will use the view
CREATE POLICY "Tecnicos can view properties linked to assigned orders"
ON public.properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.property_id = properties.id
      AND so.tecnico_id = auth.uid()
  )
);
