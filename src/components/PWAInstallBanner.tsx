import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState } from 'react';

export function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Instale o Vita FAZ TUDO</p>
        <p className="text-xs text-muted-foreground mt-0.5">Acesse direto da tela inicial do seu celular, como um app nativo.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" onClick={install} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Instalar
        </Button>
        <button onClick={() => setDismissed(true)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
