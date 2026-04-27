import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Wrench, Building2, Mail, Lock, Loader2, ShieldCheck, ArrowLeft, CheckCircle2, User, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import MFAVerify from '@/components/MFAVerify';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type SelectedProfile = 'admin' | 'imobiliaria' | 'tecnico' | 'pessoa_fisica' | null;

// Lista de papéis OBRIGATÓRIOS na tela de login. Não remova sem alinhar com o produto.
const REQUIRED_PROFILE_KEYS: Array<Exclude<SelectedProfile, null>> = [
  'admin',
  'tecnico',
  'imobiliaria',
  'pessoa_fisica',
];

export type ProfileCard = {
  key: Exclude<SelectedProfile, null>;
  title: string;
  icon: typeof ShieldCheck;
  description: string;
  gradient: string;
  borderColor: string;
  iconColor: string;
  selectedBorder: string;
};

// Fallbacks usados se alguma configuração externa remover um cartão obrigatório.
export const PROFILE_FALLBACKS: Record<Exclude<SelectedProfile, null>, ProfileCard> = {
  admin: {
    key: 'admin',
    title: 'Entrar como Administrador',
    icon: ShieldCheck,
    description: 'Aprova, controla e acompanha as OS.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    iconColor: 'text-amber-500',
    selectedBorder: 'border-amber-400 bg-amber-500/10',
  },
  tecnico: {
    key: 'tecnico',
    title: 'Entrar como Técnico',
    icon: Wrench,
    description: 'Orça, executa e finaliza o serviço.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/40 hover:border-blue-400',
    iconColor: 'text-blue-500',
    selectedBorder: 'border-blue-400 bg-blue-500/10',
  },
  imobiliaria: {
    key: 'imobiliaria',
    title: 'Entrar como Imobiliária',
    icon: Building2,
    description: 'Abre chamados e acompanha tudo.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    iconColor: 'text-emerald-500',
    selectedBorder: 'border-emerald-400 bg-emerald-500/10',
  },
  pessoa_fisica: {
    key: 'pessoa_fisica',
    title: 'Entrar como Pessoa Física',
    icon: User,
    description: 'Solicita serviços para meus imóveis.',
    gradient: 'from-purple-500/20 to-fuchsia-500/20',
    borderColor: 'border-purple-500/40 hover:border-purple-400',
    iconColor: 'text-purple-500',
    selectedBorder: 'border-purple-400 bg-purple-500/10',
  },
};

const baseProfileCards: ProfileCard[] = [
  {
    key: 'admin' as const,
    title: 'Entrar como Administrador',
    icon: ShieldCheck,
    description: 'Aprova, controla e acompanha as OS.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    iconColor: 'text-amber-500',
    selectedBorder: 'border-amber-400 bg-amber-500/10',
  },
  {
    key: 'tecnico' as const,
    title: 'Entrar como Técnico',
    icon: Wrench,
    description: 'Orça, executa e finaliza o serviço.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/40 hover:border-blue-400',
    iconColor: 'text-blue-500',
    selectedBorder: 'border-blue-400 bg-blue-500/10',
  },
  {
    key: 'imobiliaria' as const,
    title: 'Entrar como Imobiliária',
    icon: Building2,
    description: 'Abre chamados e acompanha tudo.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    iconColor: 'text-emerald-500',
    selectedBorder: 'border-emerald-400 bg-emerald-500/10',
  },
  {
    key: 'pessoa_fisica' as const,
    title: 'Entrar como Pessoa Física',
    icon: User,
    description: 'Solicita serviços para meus imóveis.',
    gradient: 'from-purple-500/20 to-fuchsia-500/20',
    borderColor: 'border-purple-500/40 hover:border-purple-400',
    iconColor: 'text-purple-500',
    selectedBorder: 'border-purple-400 bg-purple-500/10',
  },
];

// Fallback automático: garante que todo papel obrigatório esteja na lista final,
// mesmo se baseProfileCards vier incompleto/manipulado. Preserva a ordem oficial.
export function ensureRequiredProfileCards(cards: ProfileCard[]): {
  cards: ProfileCard[];
  injected: Array<Exclude<SelectedProfile, null>>;
} {
  const byKey = new Map(cards.map((c) => [c.key, c]));
  const injected: Array<Exclude<SelectedProfile, null>> = [];
  for (const key of REQUIRED_PROFILE_KEYS) {
    if (!byKey.has(key)) {
      byKey.set(key, PROFILE_FALLBACKS[key]);
      injected.push(key);
    }
  }
  // Reordena seguindo REQUIRED_PROFILE_KEYS, depois extras (caso existam).
  const ordered: ProfileCard[] = [];
  for (const key of REQUIRED_PROFILE_KEYS) {
    const c = byKey.get(key);
    if (c) ordered.push(c);
  }
  for (const c of cards) {
    if (!REQUIRED_PROFILE_KEYS.includes(c.key)) ordered.push(c);
  }
  return { cards: ordered, injected };
}

const { cards: profileCards, injected: injectedProfileKeys } =
  ensureRequiredProfileCards(baseProfileCards);

if (injectedProfileKeys.length > 0) {
  // Log estruturado em JSON para facilitar parsing por ferramentas de
  // observabilidade (Sentry, LogRocket, Datadog, etc.) e suporte.
  const event = {
    event: 'auth_page.profile_fallback_applied',
    severity: 'warning',
    timestamp: new Date().toISOString(),
    injected_keys: injectedProfileKeys,
    expected_keys: REQUIRED_PROFILE_KEYS,
    rendered_keys: profileCards.map((c) => c.key),
    context: {
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      app: 'vita-faz-tudo',
      page: 'AuthPage',
    },
  };
  // eslint-disable-next-line no-console
  console.warn('[audit]', JSON.stringify(event));
}

const AuthPage = () => {
  const { signIn, needsMFA, completeMFA, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verificação automática em runtime: se algum cartão obrigatório estiver faltando,
  // notifica o admin via toast (visível em produção) além do erro no console.
  useEffect(() => {
    if (injectedProfileKeys.length > 0) {
      toast({
        variant: 'default',
        title: 'Configuração restaurada',
        description: `Cartões restaurados via fallback: ${injectedProfileKeys.join(', ')}.`,
      });
    }
  }, [toast]);

  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // ─── RUNTIME GUARD: garante que o cartão "Pessoa Física" está renderizado no DOM
  // antes de permitir qualquer fluxo de login. Bloqueia signIn se a checagem falhar.
  const profileGridRef = useRef<HTMLDivElement | null>(null);
  const [pessoaFisicaRendered, setPessoaFisicaRendered] = useState(false);
  const [renderCheckDone, setRenderCheckDone] = useState(false);

  useEffect(() => {
    // Só roda quando estamos na tela de seleção de perfil (grid montado).
    if (selectedProfile !== null) return;
    const grid = profileGridRef.current;
    if (!grid) return;
    const node = grid.querySelector('[data-profile-key="pessoa_fisica"]');
    const ok = !!node;
    setPessoaFisicaRendered(ok);
    setRenderCheckDone(true);
    if (!ok) {
      // eslint-disable-next-line no-console
      console.error('[AuthPage] Guard de runtime: cartão "Pessoa Física" NÃO encontrado no DOM.');
      toast({
        variant: 'destructive',
        title: 'Erro crítico de configuração',
        description: 'O perfil "Pessoa Física" não foi carregado. Recarregue a página ou contate o suporte.',
      });
    }
  }, [selectedProfile, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Guard: bloqueia login se a verificação de runtime do cartão Pessoa Física falhou.
    if (renderCheckDone && !pessoaFisicaRendered) {
      toast({
        variant: 'destructive',
        title: 'Login bloqueado',
        description: 'A tela de login está em estado inconsistente (perfil "Pessoa Física" ausente). Recarregue a página.',
      });
      return;
    }

    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      // FIX: Erro #7 - Feedback claro de erro de login com destaque nos campos
      const msg = error.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid') || msg.includes('credentials')) {
        setErrors({ email: ' ', password: ' ' }); // destaque visual nos campos
        toast({ variant: 'destructive', title: 'Erro no login', description: 'E-mail ou senha inválidos. Tente novamente.' });
      } else if (msg.includes('Email not confirmed')) {
        toast({ variant: 'destructive', title: 'Email não confirmado', description: 'Verifique seu email para confirmar a conta.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro no login', description: msg || 'Erro desconhecido. Tente novamente.' });
      }
      return;
    }

    toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
    navigate('/dashboard');
  };

  const handleBack = () => {
    setSelectedProfile(null);
    setErrors({});
    setShowForgotPassword(false);
    setForgotSent(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      toast({ variant: 'destructive', title: 'Email inválido', description: 'Digite um email válido.' });
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      return;
    }
    setForgotSent(true);
  };

  const currentProfile = profileCards.find(p => p.key === selectedProfile);

  // ─── MFA VERIFICATION SCREEN ───
  if (needsMFA) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col">
        <header className="container py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Wrench className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-primary-foreground">Vita FAZ TUDO</h1>
              <p className="text-xs text-primary-foreground/60">Gestão de Manutenção</p>
            </div>
          </div>
        </header>
        <main className="flex-1 container flex flex-col items-center justify-center py-12">
          <MFAVerify
            onSuccess={() => {
              completeMFA();
              navigate('/dashboard');
            }}
            onCancel={() => signOut()}
          />
        </main>
        <footer className="container py-6">
          <p className="text-center text-sm text-primary-foreground/40">
            © 2025 Vita FAZ TUDO. Sistema de Gestão de Manutenção Imobiliária.
          </p>
        </footer>
      </div>
    );
  }

  // ─── PROFILE SELECTION SCREEN ───
  if (!selectedProfile) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col">
        <header className="container py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Wrench className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
            <h1 className="font-display font-bold text-xl text-primary-foreground">Vita FAZ TUDO</h1>
              <p className="text-xs text-primary-foreground/60">Gestão de Manutenção</p>
            </div>
          </div>
        </header>

        <main className="flex-1 container flex flex-col items-center justify-center py-12">
          <div className="w-full max-w-lg">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl font-bold text-primary-foreground mb-3">
                Como deseja entrar?
              </h2>
              <p className="text-primary-foreground/70">
                Selecione seu perfil para continuar
              </p>
            </div>

            <div className="grid gap-4" ref={profileGridRef}>
              {injectedProfileKeys.length > 0 && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-start gap-3 p-3 rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-100"
                  data-testid="fallback-banner"
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-300" />
                  <div className="text-sm leading-tight">
                    <p className="font-semibold">Configuração corrigida automaticamente</p>
                    <p className="text-amber-100/80 mt-0.5">
                      Restauramos via fallback: {injectedProfileKeys.join(', ')}.
                    </p>
                  </div>
                </div>
              )}
              {profileCards.map((card) => (
                <button
                  key={card.key}
                  data-profile-key={card.key}
                  onClick={() => setSelectedProfile(card.key)}
                  className={`group relative flex items-center gap-4 p-5 rounded-2xl border-2 bg-card/90 backdrop-blur-sm transition-all duration-200 ${card.borderColor}`}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient}`}>
                    <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                  <div className="text-left min-w-0">
                    <h3 className="font-display font-semibold text-base text-foreground leading-tight">{card.title}</h3>
                    <p className="text-sm text-muted-foreground/80 mt-0.5">{card.description}</p>
                  </div>
                  <ArrowLeft className="ml-auto h-5 w-5 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </main>

        <footer className="container py-6">
          <p className="text-center text-sm text-primary-foreground/40">
            © 2025 Vita FAZ TUDO. Sistema de Gestão de Manutenção Imobiliária.
          </p>
        </footer>
      </div>
    );
  }

  // ─── LOGIN FORM ───
  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <header className="container py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-primary-foreground">Vita FAZ TUDO</h1>
            <p className="text-xs text-primary-foreground/60">Gestão de Manutenção</p>
          </div>
        </div>
      </header>

      <main className="flex-1 container flex flex-col items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={handleBack} className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {currentProfile && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${currentProfile.selectedBorder}`}>
                <currentProfile.icon className={`h-4 w-4 ${currentProfile.iconColor}`} />
                <span className="text-sm font-medium text-foreground">{currentProfile.title}</span>
              </div>
            )}
          </div>

          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-primary-foreground mb-2">
              Entrar
            </h2>
            <p className="text-primary-foreground/70">
              Acesse sua conta — {currentProfile?.title?.replace('Entrar como ', '')}
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-xl p-8">
            {/* FIX: Erro #7/#8/#9 - Feedback de erro, validação PT-BR, destaque visual */}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={`pl-10 ${errors.email ? 'border-destructive ring-destructive' : ''}`} />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={`pl-10 ${errors.password ? 'border-destructive ring-destructive' : ''}`} />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : 'Entrar'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setForgotEmail(loginEmail); }}
                className="text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            {showForgotPassword && (
              <div className="mt-4 p-4 border border-border rounded-xl bg-muted/50">
                {forgotSent ? (
                  <div className="text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-medium text-foreground">Email enviado!</p>
                    <p className="text-xs text-muted-foreground">
                      Verifique sua caixa de entrada (e spam) para o link de redefinição.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setShowForgotPassword(false); setForgotSent(false); }}>
                      Voltar ao login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Digite seu email para receber o link de redefinição de senha.
                    </p>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowForgotPassword(false)} className="flex-1">
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={forgotLoading} className="flex-1">
                        {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Contas são criadas pela administração do sistema.
            </p>
          </div>
        </div>
      </main>

      <footer className="container py-6">
        <p className="text-center text-sm text-primary-foreground/40">
          © 2025 Vita FAZ TUDO. Sistema de Gestão de Manutenção Imobiliária.
        </p>
      </footer>
    </div>
  );
};

export default AuthPage;