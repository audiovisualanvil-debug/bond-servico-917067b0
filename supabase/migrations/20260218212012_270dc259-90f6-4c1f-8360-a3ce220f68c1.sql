-- Limpar todos os dados mantendo o admin (Carlos Vita)
-- 1. Tabelas dependentes de service_orders
DELETE FROM public.completion_reports;
DELETE FROM public.service_order_comments;
DELETE FROM public.service_order_items;

-- 2. Ordens de serviço
DELETE FROM public.service_orders;

-- 3. Imóveis
DELETE FROM public.properties;

-- 4. Roles de não-admin
DELETE FROM public.user_roles WHERE role != 'admin';

-- 5. Perfis de não-admin
DELETE FROM public.profiles WHERE id != 'e822d741-0448-43a8-9677-f31f15274231';