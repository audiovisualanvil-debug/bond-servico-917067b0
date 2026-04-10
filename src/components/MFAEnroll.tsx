import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Copy, CheckCircle2 } from 'lucide-react';

interface MFAEnrollProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const MFAEnroll = ({ onSuccess, onCancel }: MFAEnrollProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'qr' | 'verify'>('qr');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Vita FAZ TUDO',
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep('qr');
    } catch (err: any) {
      toast({ title: 'Erro ao iniciar configuração MFA', description: err.message, variant: 'destructive' });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.length !== 6) {
      toast({ title: 'Digite o código de 6 dígitos', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      toast({ title: 'MFA ativado com sucesso!', description: 'Sua conta agora está protegida com autenticação de dois fatores.' });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Código inválido', description: 'Verifique o código no seu app autenticador e tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast({ title: 'Código copiado!' });
  };

  // Initial state - start enrollment
  if (!qrCode) {
    return (
      <div className="space-y-4 text-center">
        <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
        <div>
          <h3 className="font-semibold text-lg">Ativar Autenticação de Dois Fatores</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Use um app autenticador como Google Authenticator ou Authy para gerar códigos de verificação.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleEnroll} disabled={isEnrolling}>
            {isEnrolling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : 'Começar'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-semibold text-lg">Configurar Autenticador</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Escaneie o QR code abaixo com seu app autenticador
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-xl">
          <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
        </div>
      </div>

      {/* Manual secret */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground text-center">
          Ou insira este código manualmente no app:
        </p>
        <div className="flex items-center gap-2 justify-center">
          <code className="text-xs bg-muted px-3 py-1.5 rounded font-mono select-all break-all">
            {secret}
          </code>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copySecret}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Verify */}
      <form onSubmit={handleVerify} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="mfa-code">Código de verificação</Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-lg tracking-widest font-mono"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || verifyCode.length !== 6} className="flex-1">
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</> : 'Ativar MFA'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MFAEnroll;
