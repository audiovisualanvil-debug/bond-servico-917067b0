
-- =============================================
-- BUSINESS RULES AT DATABASE LEVEL
-- =============================================

-- 1. STATUS TRANSITION VALIDATION
-- Prevents invalid status jumps
CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_transitions JSONB := '{
    "aguardando_orcamento": ["aguardando_aprovacao_admin"],
    "aguardando_aprovacao_admin": ["enviado_imobiliaria", "aguardando_orcamento"],
    "enviado_imobiliaria": ["aprovado_aguardando", "aguardando_aprovacao_admin"],
    "aprovado_aguardando": ["em_execucao"],
    "em_execucao": ["concluido"],
    "concluido": []
  }'::JSONB;
  allowed_targets JSONB;
BEGIN
  -- Skip validation on INSERT (new records start at default status)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- If status hasn't changed, allow the update
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions for the current status
  allowed_targets := valid_transitions -> OLD.status::TEXT;

  -- Check if the new status is in the allowed list
  IF allowed_targets IS NULL OR NOT allowed_targets ? NEW.status::TEXT THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %. Transições permitidas: %',
      OLD.status, NEW.status, allowed_targets;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_status_transition
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_transition();


-- 2. FIELD PROTECTION: Technician cannot modify admin/pricing fields
-- Technician cannot update: final_price, admin_approved_at, client_approved_at
CREATE OR REPLACE FUNCTION public.protect_service_order_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Get the current user's role
  user_role := public.get_user_role(auth.uid());

  -- TECHNICIAN restrictions
  IF user_role = 'tecnico' THEN
    -- Cannot modify pricing/admin fields
    IF NEW.final_price IS DISTINCT FROM OLD.final_price THEN
      RAISE EXCEPTION 'Técnico não pode alterar o valor final (final_price)';
    END IF;
    IF NEW.admin_approved_at IS DISTINCT FROM OLD.admin_approved_at THEN
      RAISE EXCEPTION 'Técnico não pode alterar a aprovação do admin';
    END IF;
    IF NEW.client_approved_at IS DISTINCT FROM OLD.client_approved_at THEN
      RAISE EXCEPTION 'Técnico não pode alterar a aprovação do cliente';
    END IF;
    -- Cannot change imobiliaria ownership
    IF NEW.imobiliaria_id IS DISTINCT FROM OLD.imobiliaria_id THEN
      RAISE EXCEPTION 'Técnico não pode alterar a imobiliária da OS';
    END IF;
  END IF;

  -- IMOBILIARIA restrictions
  IF user_role = 'imobiliaria' THEN
    -- Cannot modify technician cost fields
    IF NEW.technician_cost IS DISTINCT FROM OLD.technician_cost THEN
      RAISE EXCEPTION 'Imobiliária não pode alterar o custo do técnico';
    END IF;
    IF NEW.technician_description IS DISTINCT FROM OLD.technician_description THEN
      RAISE EXCEPTION 'Imobiliária não pode alterar a descrição do técnico';
    END IF;
    -- Cannot modify admin pricing
    IF NEW.final_price IS DISTINCT FROM OLD.final_price THEN
      RAISE EXCEPTION 'Imobiliária não pode alterar o valor final';
    END IF;
    IF NEW.admin_approved_at IS DISTINCT FROM OLD.admin_approved_at THEN
      RAISE EXCEPTION 'Imobiliária não pode alterar a aprovação do admin';
    END IF;
    -- Cannot assign technician
    IF NEW.tecnico_id IS DISTINCT FROM OLD.tecnico_id THEN
      RAISE EXCEPTION 'Imobiliária não pode atribuir técnico';
    END IF;
  END IF;

  -- ADMIN has no field restrictions (can edit everything)

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_service_order_fields
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_service_order_fields();


-- 3. FIELD PROTECTION: Only tecnico/admin can modify real_cost in items
CREATE OR REPLACE FUNCTION public.protect_item_real_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  user_role := public.get_user_role(auth.uid());

  -- Only tecnico and admin can set/modify real_cost
  IF user_role = 'imobiliaria' THEN
    IF TG_OP = 'INSERT' AND NEW.real_cost IS NOT NULL AND NEW.real_cost <> 0 THEN
      RAISE EXCEPTION 'Imobiliária não pode definir custo real dos itens';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.real_cost IS DISTINCT FROM OLD.real_cost THEN
      RAISE EXCEPTION 'Imobiliária não pode alterar custo real dos itens';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_item_real_cost
  BEFORE INSERT OR UPDATE ON public.service_order_items
  FOR EACH ROW EXECUTE FUNCTION public.protect_item_real_cost();


-- 4. STATUS TRANSITION SIDE EFFECTS
-- Auto-populate timestamp fields when status changes
CREATE OR REPLACE FUNCTION public.status_transition_side_effects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- When moving to aguardando_aprovacao_admin, require technician quote
  IF NEW.status = 'aguardando_aprovacao_admin' THEN
    IF NEW.technician_cost IS NULL OR NEW.technician_cost <= 0 THEN
      RAISE EXCEPTION 'Orçamento do técnico é obrigatório para enviar para aprovação';
    END IF;
    IF NEW.technician_description IS NULL OR NEW.technician_description = '' THEN
      RAISE EXCEPTION 'Descrição do técnico é obrigatória para enviar para aprovação';
    END IF;
    NEW.quote_sent_at := COALESCE(NEW.quote_sent_at, now());
  END IF;

  -- When moving to enviado_imobiliaria, require admin final price
  IF NEW.status = 'enviado_imobiliaria' THEN
    IF NEW.final_price IS NULL OR NEW.final_price <= 0 THEN
      RAISE EXCEPTION 'Valor final é obrigatório para enviar à imobiliária';
    END IF;
    NEW.admin_approved_at := COALESCE(NEW.admin_approved_at, now());
  END IF;

  -- When moving to aprovado_aguardando, record client approval
  IF NEW.status = 'aprovado_aguardando' THEN
    NEW.client_approved_at := COALESCE(NEW.client_approved_at, now());
  END IF;

  -- When moving to em_execucao, record start
  IF NEW.status = 'em_execucao' THEN
    NEW.execution_started_at := COALESCE(NEW.execution_started_at, now());
  END IF;

  -- When moving to concluido, record completion
  IF NEW.status = 'concluido' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_status_side_effects
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.status_transition_side_effects();
