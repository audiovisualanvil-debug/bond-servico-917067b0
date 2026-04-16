
CREATE OR REPLACE FUNCTION public.restrict_tecnico_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only restrict technicians (not admins)
  IF has_role(auth.uid(), 'tecnico') AND NOT has_role(auth.uid(), 'admin') THEN
    -- Allow cost fields when submitting a quote (status transition from aguardando_orcamento_prestador to aguardando_aprovacao_admin)
    IF NOT (OLD.status = 'aguardando_orcamento_prestador' AND NEW.status = 'aguardando_aprovacao_admin') THEN
      IF NEW.labor_cost IS DISTINCT FROM OLD.labor_cost THEN
        RAISE EXCEPTION 'Técnicos não podem alterar custo de mão de obra';
      END IF;
      IF NEW.material_cost IS DISTINCT FROM OLD.material_cost THEN
        RAISE EXCEPTION 'Técnicos não podem alterar custo de material';
      END IF;
      IF NEW.tax_cost IS DISTINCT FROM OLD.tax_cost THEN
        RAISE EXCEPTION 'Técnicos não podem alterar custo de impostos';
      END IF;
    END IF;
    IF NEW.final_price IS DISTINCT FROM OLD.final_price THEN
      RAISE EXCEPTION 'Técnicos não podem alterar o preço final';
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
