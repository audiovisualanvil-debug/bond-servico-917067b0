
-- Fix security definer view warning - explicitly set SECURITY INVOKER
ALTER VIEW public.service_orders_client SET (security_invoker = on);
ALTER VIEW public.service_order_items_client SET (security_invoker = on);
