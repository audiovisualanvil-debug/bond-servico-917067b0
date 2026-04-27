-- ============ PROPERTIES ============
DROP POLICY IF EXISTS "Imobiliarias can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Imobiliarias can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Imobiliarias can view own properties" ON public.properties;

CREATE POLICY "Owners can insert own properties"
ON public.properties FOR INSERT TO authenticated
WITH CHECK (
  imobiliaria_id = auth.uid()
  AND (has_role(auth.uid(), 'imobiliaria'::app_role) OR has_role(auth.uid(), 'pessoa_fisica'::app_role))
);

CREATE POLICY "Owners can update own properties"
ON public.properties FOR UPDATE TO authenticated
USING (
  imobiliaria_id = auth.uid()
  AND (has_role(auth.uid(), 'imobiliaria'::app_role) OR has_role(auth.uid(), 'pessoa_fisica'::app_role))
);

CREATE POLICY "Owners can view own properties"
ON public.properties FOR SELECT TO authenticated
USING (
  imobiliaria_id = auth.uid()
  AND (has_role(auth.uid(), 'imobiliaria'::app_role) OR has_role(auth.uid(), 'pessoa_fisica'::app_role))
);

-- ============ SERVICE_ORDERS ============
DROP POLICY IF EXISTS "Imobiliarias insert own orders" ON public.service_orders;
DROP POLICY IF EXISTS "Imobiliarias update own orders" ON public.service_orders;
DROP POLICY IF EXISTS "Imobiliarias view own orders" ON public.service_orders;

CREATE POLICY "Requesters insert own orders"
ON public.service_orders FOR INSERT TO authenticated
WITH CHECK (
  imobiliaria_id = auth.uid()
  AND (has_role(auth.uid(), 'imobiliaria'::app_role) OR has_role(auth.uid(), 'pessoa_fisica'::app_role))
);

CREATE POLICY "Requesters update own orders"
ON public.service_orders FOR UPDATE TO authenticated
USING (
  imobiliaria_id = auth.uid()
  AND (has_role(auth.uid(), 'imobiliaria'::app_role) OR has_role(auth.uid(), 'pessoa_fisica'::app_role))
);

CREATE POLICY "Requesters view own orders"
ON public.service_orders FOR SELECT TO authenticated
USING (imobiliaria_id = auth.uid());

-- ============ COMMENTS ============
DROP POLICY IF EXISTS "Authors can insert comments on accessible orders" ON public.service_order_comments;
DROP POLICY IF EXISTS "Users can view comments on accessible orders" ON public.service_order_comments;

CREATE POLICY "Authors can insert comments on accessible orders"
ON public.service_order_comments FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM service_orders
      WHERE service_orders.id = service_order_comments.service_order_id
        AND (service_orders.imobiliaria_id = auth.uid() OR service_orders.tecnico_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can view comments on accessible orders"
ON public.service_order_comments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM service_orders
    WHERE service_orders.id = service_order_comments.service_order_id
      AND (service_orders.imobiliaria_id = auth.uid() OR service_orders.tecnico_id = auth.uid())
  )
);

-- ============ COMPLETION REPORTS ============
DROP POLICY IF EXISTS "Imobiliarias view reports on own orders" ON public.completion_reports;

CREATE POLICY "Requesters view reports on own orders"
ON public.completion_reports FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM service_orders
    WHERE service_orders.id = completion_reports.service_order_id
      AND service_orders.imobiliaria_id = auth.uid()
  )
);

-- ============ SERVICE ORDER ITEMS ============
DROP POLICY IF EXISTS "Imobiliarias view items on own orders" ON public.service_order_items;

CREATE POLICY "Requesters view items on own orders"
ON public.service_order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM service_orders
    WHERE service_orders.id = service_order_items.service_order_id
      AND service_orders.imobiliaria_id = auth.uid()
  )
);

-- ============ PROFILES (allow tecnico to see PF profile linked to assigned orders – already covered by existing policy) ============

-- ============ TRIGGER: restrict_imobiliaria_update -> also apply to pessoa_fisica ============
CREATE OR REPLACE FUNCTION public.restrict_imobiliaria_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (has_role(auth.uid(), 'imobiliaria') OR has_role(auth.uid(), 'pessoa_fisica'))
     AND NOT has_role(auth.uid(), 'admin') THEN
    IF NEW.technician_cost IS DISTINCT FROM OLD.technician_cost THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar custo do técnico';
    END IF;
    IF NEW.labor_cost IS DISTINCT FROM OLD.labor_cost THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar custo de mão de obra';
    END IF;
    IF NEW.material_cost IS DISTINCT FROM OLD.material_cost THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar custo de material';
    END IF;
    IF NEW.tax_cost IS DISTINCT FROM OLD.tax_cost THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar custo de impostos';
    END IF;
    IF NEW.final_price IS DISTINCT FROM OLD.final_price THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar preço final';
    END IF;
    IF NEW.technician_description IS DISTINCT FROM OLD.technician_description THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar descrição técnica';
    END IF;
    IF NEW.tecnico_id IS DISTINCT FROM OLD.tecnico_id THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar o técnico atribuído';
    END IF;
    IF NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar método de pagamento';
    END IF;
    IF NEW.admin_approved_at IS DISTINCT FROM OLD.admin_approved_at THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar aprovação do admin';
    END IF;
    IF NEW.execution_started_at IS DISTINCT FROM OLD.execution_started_at THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar início de execução';
    END IF;
    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar data de conclusão';
    END IF;
    IF NEW.estimated_deadline IS DISTINCT FROM OLD.estimated_deadline THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar prazo estimado';
    END IF;
    IF NEW.quote_sent_at IS DISTINCT FROM OLD.quote_sent_at THEN
      RAISE EXCEPTION 'Solicitantes não podem alterar data de envio do orçamento';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;