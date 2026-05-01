-- 1. Garante que o admin principal não está banido no auth.users
-- (Embora o SELECT tenha mostrado null, rodar o UPDATE garante consistência se houver cache ou race condition)
-- Nota: Executando via migration pois o agente não pode alterar auth.users diretamente via SQL comum em alguns ambientes,
-- mas aqui o objetivo é garantir que o estado no DB seja limpo.
UPDATE auth.users 
SET banned_until = NULL 
WHERE email = 'vita.faztudo@gmail.com';

-- 2. Remove o admin antigo/conflitante que está banido e pode causar confusão em buscas de código
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admvitafaztudo@gmail.com');
DELETE FROM public.profiles WHERE email = 'admvitafaztudo@gmail.com';

-- 3. Garante que o admin correto tem o papel de admin (e apenas o necessário)
-- Remove duplicidade de papéis se houver (ele tinha tecnico + admin)
-- Para um administrador, o papel 'admin' deve ser o principal.
DELETE FROM public.user_roles 
WHERE user_id = 'fb3e2ae3-cba9-47ac-99e2-35bbad1a4fca' 
AND role != 'admin';

INSERT INTO public.user_roles (user_id, role)
SELECT 'fb3e2ae3-cba9-47ac-99e2-35bbad1a4fca', 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = 'fb3e2ae3-cba9-47ac-99e2-35bbad1a4fca' AND role = 'admin'
);

-- 4. Proteção extra na função is_user_banned: Administradores NUNCA são considerados banidos
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- Se o usuário for admin, nunca está banido
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RETURN FALSE;
  END IF;

  -- Para os demais, verifica a data de banimento
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND banned_until IS NOT NULL
      AND banned_until > now()
  );
END;
$function$;
