-- 1. CORREÇÃO REALTIME (ERRO)
-- Habilita RLS na tabela do sistema Realtime para controlar inscrições em canais
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados recebam mensagens apenas de tópicos permitidos.
-- Como o app usa postgres_changes, as RLS das tabelas já protegem os dados.
-- Esta política protege o canal de Broadcast/Presence (realtime.messages).
DROP POLICY IF EXISTS "authenticated_can_receive_broadcast" ON realtime.messages;
CREATE POLICY "authenticated_can_receive_broadcast"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Admin pode tudo
  has_role(auth.uid(), 'admin') OR
  -- Usuários só podem ver mensagens de tópicos que não sejam canais globais sensíveis
  -- ou que correspondam ao seu próprio ID (presença/notificações pessoais)
  (topic IS NOT NULL AND (
    topic = 'notifications:' || auth.uid()::text OR
    topic = 'presence:' || auth.uid()::text OR
    topic LIKE 'os:%' -- O acesso real aos dados da OS será validado pela RLS da tabela service_orders
  ))
);

-- 2. CORREÇÃO COMENTÁRIOS (AVISO)
-- Garante que Admin tenha acesso SELECT explícito (resolve o aviso do scanner)
DROP POLICY IF EXISTS "Admins can view all comments" ON public.service_order_comments;
CREATE POLICY "Admins can view all comments"
ON public.service_order_comments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Ajusta a policy existente para garantir que ela não conflite
-- "Users can view comments on accessible orders" já cobre imobiliária e técnico.

-- 3. CORREÇÃO SECURITY DEFINER (AVISOS)
-- Revoga execução pública de TODAS as funções no schema public por segurança
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Concede execução apenas para usuários autenticados nas funções necessárias para policies/triggers
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_os_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restrict_tecnico_update() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restrict_imobiliaria_update() TO authenticated, service_role;

-- handle_new_user é usada apenas por trigger do sistema auth
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
