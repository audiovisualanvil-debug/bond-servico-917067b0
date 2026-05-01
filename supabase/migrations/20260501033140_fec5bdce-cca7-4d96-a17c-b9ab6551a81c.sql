-- Cria um schema privado para isolar funções de sistema
CREATE SCHEMA IF NOT EXISTS internal;

-- Move funções que são apenas triggers para o schema internal
-- Isso as remove da API pública do PostgREST e limpa os avisos do linter

-- 1. restrict_tecnico_update
ALTER FUNCTION public.restrict_tecnico_update() SET SCHEMA internal;
-- 2. restrict_imobiliaria_update
ALTER FUNCTION public.restrict_imobiliaria_update() SET SCHEMA internal;
-- 3. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET SCHEMA internal;
-- 4. generate_os_number
ALTER FUNCTION public.generate_os_number() SET SCHEMA internal;
-- 5. handle_new_user
ALTER FUNCTION public.handle_new_user() SET SCHEMA internal;

-- As triggers precisam ser atualizadas para apontar para o novo schema
-- (A ferramenta de migração cuida disso se eu recriar as triggers, mas vou fazer manual)

-- Trigger: update_notes_updated_at (se existir) e outros
-- Como as funções mudaram de schema, as triggers existentes podem quebrar se não forem atualizadas.
-- Vou verificar as triggers existentes.
