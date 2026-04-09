-- Remove audit_logs from the supabase_realtime publication
-- to prevent sensitive audit data from being broadcast to all authenticated users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.audit_logs;
  END IF;
END $$;