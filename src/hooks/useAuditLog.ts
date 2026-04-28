import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
}

export function useAuditLog() {
  const log = useCallback(async (entry: AuditLogEntry) => {
    try {
      const { error } = await supabase.functions.invoke('log-audit', {
        body: entry,
      });
      if (error) {
        console.warn('[audit] log-audit retornou erro:', error.message, entry);
      }
    } catch (err) {
      console.warn('[audit] log-audit falhou (rede):', err, entry);
      // Fire-and-forget: don't block the main action
    }
  }, []);

  return { log };
}
