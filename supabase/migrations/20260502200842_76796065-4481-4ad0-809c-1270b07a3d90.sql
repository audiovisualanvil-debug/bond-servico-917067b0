-- 1. Restringir execução de funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_user_banned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_banned(uuid) TO authenticated;

-- 2. Configuração de Realtime segura
-- Primeiro, desativa para tudo e depois ativa apenas nas tabelas necessárias
DO $$ 
BEGIN
  -- Tenta remover a publicação se existir para limpar
  DROP PUBLICATION IF EXISTS supabase_realtime;
EXCEPTION WHEN OTHERS THEN
  -- Ignora se não existir
END $$;

CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.service_order_comments,
  public.service_orders;

-- 3. Refinar RLS para Comentários (Garantir acesso Admin)
-- Remove política antiga se existir e cria uma robusta
DROP POLICY IF EXISTS "Admins full access on comments" ON public.service_order_comments;
CREATE POLICY "Admins full access on comments" 
ON public.service_order_comments 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Política para técnicos e clientes verem comentários de suas OS
DROP POLICY IF EXISTS "Users view comments of their service orders" ON public.service_order_comments;
CREATE POLICY "Users view comments of their service orders"
ON public.service_order_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_comments.service_order_id
    AND (so.imobiliaria_id = auth.uid() OR so.tecnico_id = auth.uid())
  )
);

-- Permissão para inserir comentários
DROP POLICY IF EXISTS "Authorized users can insert comments" ON public.service_order_comments;
CREATE POLICY "Authorized users can insert comments"
ON public.service_order_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'tecnico')
  )
);
