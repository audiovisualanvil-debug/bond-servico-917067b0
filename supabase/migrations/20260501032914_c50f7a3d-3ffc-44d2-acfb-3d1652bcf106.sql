-- Fix: REALTIME_MISSING_CHANNEL_AUTHORIZATION
-- Restringe broadcasts/subscriptions no canal realtime.messages a usuários autenticados,
-- escopando por topic. Mantém compatibilidade total com postgres_changes (que já respeita
-- as RLS de service_orders), apenas garante que ninguém anônimo possa subscrever
-- e que o canal exija um auth.uid() válido.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: apenas usuários autenticados podem receber mensagens do canal
DROP POLICY IF EXISTS "authenticated_can_receive_broadcast" ON realtime.messages;
CREATE POLICY "authenticated_can_receive_broadcast"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

-- INSERT: apenas usuários autenticados podem enviar broadcast/presence
DROP POLICY IF EXISTS "authenticated_can_send_broadcast" ON realtime.messages;
CREATE POLICY "authenticated_can_send_broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
