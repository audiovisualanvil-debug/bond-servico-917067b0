import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';

interface MFAVerifyProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const MFAVerify = ({ onSuccess, onCancel }: MFAVerifyProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setIsLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        toast({ title: 'Erro', description: 'Nenhum fator MFA encontrado.', variant: 'destructive' });
        return;
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      onSuccess();
    } catch (err: any) {
      toast({
        title: 'Código inválido',
        description: 'Verifique o código no seu app autenticador e tente novamente.',
        variant: 'destructive',
      });
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="font-display text-2xl font-bold text-primary-foreground">
          Verificação em Dois Fatores
        </h2>
        <p className="text-sm text-primary-foreground/70">
          Digite o código de 6 dígitos do seu app autenticador
        </p>
      </div>

      <div className="bg-card rounded-2xl shadow-xl p-6">
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-verify-code">Código de verificação</Label>
            <Input
              id="mfa-verify-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-[0.5em] font-mono h-14"
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
            ) : (
              'Verificar'
            )}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
};

export default MFAVerify;
