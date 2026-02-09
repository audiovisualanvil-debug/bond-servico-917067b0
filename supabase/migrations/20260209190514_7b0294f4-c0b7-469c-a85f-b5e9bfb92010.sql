
-- Drop and recreate the client view
DROP VIEW IF EXISTS public.service_order_items_client;
DROP VIEW IF EXISTS public.service_orders_client;

CREATE VIEW public.service_orders_client AS
SELECT 
  id, os_number, property_id, imobiliaria_id, tecnico_id,
  problem, photos, urgency, requester_name,
  technician_description, estimated_deadline,
  final_price, quote_sent_at,
  admin_approved_at, client_approved_at,
  execution_started_at, completed_at,
  status, created_at, updated_at
FROM public.service_orders;

-- Recreate dependent view
CREATE VIEW public.service_order_items_client AS
SELECT 
  id, service_order_id, description, created_at, updated_at
FROM public.service_order_items;

-- Add admin INSERT policy for service_orders (may already exist from partial migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin can create orders' AND tablename = 'service_orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin can create orders" ON public.service_orders FOR INSERT WITH CHECK (has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;
