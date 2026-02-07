
-- Fix security definer view issue
DROP VIEW IF EXISTS public.service_orders_client;

CREATE VIEW public.service_orders_client
WITH (security_invoker = true)
AS
SELECT
  id, os_number, property_id, imobiliaria_id, tecnico_id,
  problem, photos, urgency, requester_name,
  technician_description, estimated_deadline, quote_sent_at,
  final_price, admin_approved_at, client_approved_at,
  execution_started_at, completed_at,
  status, created_at, updated_at
FROM public.service_orders;
