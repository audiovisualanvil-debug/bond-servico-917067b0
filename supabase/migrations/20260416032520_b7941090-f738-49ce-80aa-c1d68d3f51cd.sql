-- Limpar todos os dados operacionais, mantendo perfis/roles/credenciais
-- Ordem: tabelas dependentes primeiro para evitar violações de FK

DELETE FROM public.service_order_comments;
DELETE FROM public.service_order_items;
DELETE FROM public.completion_reports;
DELETE FROM public.service_orders;
DELETE FROM public.properties;
DELETE FROM public.audit_logs;
DELETE FROM public.push_subscriptions;