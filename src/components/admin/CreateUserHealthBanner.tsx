import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL || 'https://qdjnmmnageildowekqly.supabase.co'}/functions/v1`;

type HealthState = 'checking' | 'ok' | 'down';

/**
 * Pings the create-user edge function via OPTIONS (CORS preflight).
 * Re-checks every 30s. Renders a yellow banner when the function is unreachable.
 */
export function CreateUserHealthBanner() {
  const [state, setState] = useState<HealthState>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${FUNCTIONS_BASE}/create-user`, {
          method: 'OPTIONS',
          headers: { 'Access-Control-Request-Method': 'POST' },
        });
        if (cancelled) return;
        setState(res.ok || res.status === 204 ? 'ok' : 'down');
      } catch {
        if (cancelled) return;
        setState('down');
      } finally {
        if (!cancelled) setLastChecked(new Date());
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (state === 'checking' || state === 'ok') {
    // No-op when healthy — show only on issues to avoid noise.
    if (state === 'ok' && lastChecked) {
      return (
        <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          Serviço operacional
        </div>
      );
    }
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-3 rounded-md border border-yellow-300 bg-yellow-500/10 text-yellow-900 p-3 text-sm flex items-start gap-2"
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <div className="font-medium">Serviço de criação indisponível</div>
        <div className="text-xs opacity-90">
          Não foi possível alcançar a função <span className="font-mono">create-user</span>. Tentando novamente a cada 30s.
        </div>
      </div>
    </div>
  );
}