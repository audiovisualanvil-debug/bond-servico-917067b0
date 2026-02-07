
-- 1. Rename enum value: aguardando_orcamento → aguardando_orcamento_prestador
ALTER TYPE public.os_status RENAME VALUE 'aguardando_orcamento' TO 'aguardando_orcamento_prestador';

-- 2. Update default value for status column
ALTER TABLE public.service_orders ALTER COLUMN status SET DEFAULT 'aguardando_orcamento_prestador'::os_status;

-- 3. Update validate_status_transition function with new status name
CREATE OR REPLACE FUNCTION public.validate_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  valid_transitions JSONB := '{
    "aguardando_orcamento_prestador": ["aguardando_aprovacao_admin"],
    "aguardando_aprovacao_admin": ["enviado_imobiliaria", "aguardando_orcamento_prestador"],
    "enviado_imobiliaria": ["aprovado_aguardando", "aguardando_aprovacao_admin"],
    "aprovado_aguardando": ["em_execucao"],
    "em_execucao": ["concluido"],
    "concluido": []
  }'::JSONB;
  allowed_targets JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  allowed_targets := valid_transitions -> OLD.status::TEXT;

  IF allowed_targets IS NULL OR NOT allowed_targets ? NEW.status::TEXT THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %. Transições permitidas: %',
      OLD.status, NEW.status, allowed_targets;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Update status_transition_side_effects to reference new status name
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

-- 5. Update Admin SELECT policy: admin cannot see orders in aguardando_orcamento_prestador
DROP POLICY IF EXISTS "Admin can view all orders" ON public.service_orders;
CREATE POLICY "Admin can view all orders"
ON public.service_orders
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND status != 'aguardando_orcamento_prestador'::os_status
);

-- 6. Update Admin UPDATE policy: admin cannot update orders in aguardando_orcamento_prestador
DROP POLICY IF EXISTS "Admin can update all orders" ON public.service_orders;
CREATE POLICY "Admin can update all orders"
ON public.service_orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND status != 'aguardando_orcamento_prestador'::os_status
);

-- 7. Update Admin DELETE policy: admin cannot delete orders in aguardando_orcamento_prestador
DROP POLICY IF EXISTS "Admin can delete orders" ON public.service_orders;
CREATE POLICY "Admin can delete orders"
ON public.service_orders
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND status != 'aguardando_orcamento_prestador'::os_status
);

-- 8. Update Tecnico SELECT policy: can see assigned orders + unassigned orders in aguardando_orcamento_prestador
DROP POLICY IF EXISTS "Tecnico can view assigned orders" ON public.service_orders;
CREATE POLICY "Tecnico can view orders"
ON public.service_orders
FOR SELECT
USING (
  tecnico_id = auth.uid()
  OR (
    status = 'aguardando_orcamento_prestador'::os_status
    AND tecnico_id IS NULL
    AND has_role(auth.uid(), 'tecnico'::app_role)
  )
);

-- 9. Update Tecnico UPDATE policy: can update assigned orders + claim unassigned orders
DROP POLICY IF EXISTS "Tecnico can update assigned orders" ON public.service_orders;
CREATE POLICY "Tecnico can update orders"
ON public.service_orders
FOR UPDATE
USING (
  tecnico_id = auth.uid()
  OR (
    status = 'aguardando_orcamento_prestador'::os_status
    AND tecnico_id IS NULL
    AND has_role(auth.uid(), 'tecnico'::app_role)
  )
);

-- 10. Recreate the service_orders_client view with the new status name
CREATE OR REPLACE VIEW public.service_orders_client AS
SELECT
  id, os_number, property_id, imobiliaria_id, tecnico_id,
  problem, photos, urgency, requester_name,
  technician_description,
  -- Hide technician_cost from imobiliaria (they only see final_price)
  estimated_deadline, quote_sent_at, final_price,
  admin_approved_at, client_approved_at, execution_started_at, completed_at,
  status, created_at, updated_at
FROM public.service_orders
WHERE imobiliaria_id = auth.uid();
