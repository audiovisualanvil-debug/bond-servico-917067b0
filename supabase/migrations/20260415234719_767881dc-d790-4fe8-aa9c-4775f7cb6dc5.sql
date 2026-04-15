
-- Fix 1: Restrict imobiliária UPDATE on service_orders to safe columns only
CREATE OR REPLACE FUNCTION public.restrict_imobiliaria_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only restrict imobiliárias (not admins)
  IF has_role(auth.uid(), 'imobiliaria') AND NOT has_role(auth.uid(), 'admin') THEN
    IF NEW.technician_cost IS DISTINCT FROM OLD.technician_cost THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar custo do técnico';
    END IF;
    IF NEW.labor_cost IS DISTINCT FROM OLD.labor_cost THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar custo de mão de obra';
    END IF;
    IF NEW.material_cost IS DISTINCT FROM OLD.material_cost THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar custo de material';
    END IF;
    IF NEW.tax_cost IS DISTINCT FROM OLD.tax_cost THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar custo de impostos';
    END IF;
    IF NEW.final_price IS DISTINCT FROM OLD.final_price THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar preço final';
    END IF;
    IF NEW.technician_description IS DISTINCT FROM OLD.technician_description THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar descrição técnica';
    END IF;
    IF NEW.tecnico_id IS DISTINCT FROM OLD.tecnico_id THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar o técnico atribuído';
    END IF;
    IF NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar método de pagamento';
    END IF;
    IF NEW.admin_approved_at IS DISTINCT FROM OLD.admin_approved_at THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar aprovação do admin';
    END IF;
    IF NEW.execution_started_at IS DISTINCT FROM OLD.execution_started_at THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar início de execução';
    END IF;
    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar data de conclusão';
    END IF;
    IF NEW.estimated_deadline IS DISTINCT FROM OLD.estimated_deadline THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar prazo estimado';
    END IF;
    IF NEW.quote_sent_at IS DISTINCT FROM OLD.quote_sent_at THEN
      RAISE EXCEPTION 'Imobiliárias não podem alterar data de envio do orçamento';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER restrict_imobiliaria_update_trigger
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_imobiliaria_update();

-- Fix 2: Recreate properties_limited view WITHOUT sensitive PII fields
DROP VIEW IF EXISTS public.properties_limited;
CREATE VIEW public.properties_limited
WITH (security_invoker = on)
AS
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
  updated_at
FROM public.properties;

-- Grant technicians access to the limited view  
COMMENT ON VIEW public.properties_limited IS 'Properties view excluding owner/tenant PII for technicians';
