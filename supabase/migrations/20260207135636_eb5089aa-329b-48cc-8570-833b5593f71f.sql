
-- Update the side effects trigger to auto-calculate final_price as technician_cost * 1.4
CREATE OR REPLACE FUNCTION public.status_transition_side_effects()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- When tecnico submits quote → aguardando_aprovacao_admin
  IF NEW.status = 'aguardando_aprovacao_admin' THEN
    IF NEW.technician_cost IS NULL OR NEW.technician_cost <= 0 THEN
      RAISE EXCEPTION 'Orçamento do técnico é obrigatório para enviar para aprovação';
    END IF;
    IF NEW.technician_description IS NULL OR NEW.technician_description = '' THEN
      RAISE EXCEPTION 'Descrição do técnico é obrigatória para enviar para aprovação';
    END IF;
    NEW.quote_sent_at := COALESCE(NEW.quote_sent_at, now());
    -- Auto-calculate final_price as technician_cost + 40% if not already set
    IF NEW.final_price IS NULL OR NEW.final_price <= 0 THEN
      NEW.final_price := ROUND(NEW.technician_cost * 1.4, 2);
    END IF;
  END IF;

  -- When admin sends to imobiliaria → enviado_imobiliaria
  IF NEW.status = 'enviado_imobiliaria' THEN
    IF NEW.final_price IS NULL OR NEW.final_price <= 0 THEN
      RAISE EXCEPTION 'Valor final é obrigatório para enviar à imobiliária';
    END IF;
    NEW.admin_approved_at := COALESCE(NEW.admin_approved_at, now());
  END IF;

  IF NEW.status = 'aprovado_aguardando' THEN
    NEW.client_approved_at := COALESCE(NEW.client_approved_at, now());
  END IF;

  IF NEW.status = 'em_execucao' THEN
    NEW.execution_started_at := COALESCE(NEW.execution_started_at, now());
  END IF;

  IF NEW.status = 'concluido' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$function$;
