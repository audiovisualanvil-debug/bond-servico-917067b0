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
      await supabase.functions.invoke('log-audit', {
        body: entry,
      });
    } catch (err) {
      console.error('Audit log failed:', err);
      // Fire-and-forget: don't block the main action
    }
  }, []);

  return { log };
}
