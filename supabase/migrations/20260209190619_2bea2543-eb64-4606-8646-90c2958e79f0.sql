
-- Fix security definer views by setting security_invoker
ALTER VIEW public.service_orders_client SET (security_invoker = on);
ALTER VIEW public.service_order_items_client SET (security_invoker = on);
