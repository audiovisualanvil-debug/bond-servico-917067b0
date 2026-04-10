import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wrench, Building2, Mail, Lock, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type SelectedProfile = 'admin' | 'imobiliaria' | 'tecnico' | null;

const profileCards = [
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
];

const AuthPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

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
  };

  const currentProfile = profileCards.find(p => p.key === selectedProfile);

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
              <h1 className="font-display font-bold text-xl text-primary-foreground">Faz-Tudo</h1>
              <p className="text-xs text-primary-foreground/60">Imobiliário</p>
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

            <div className="grid gap-4">
              {profileCards.map((card) => (
                <button
                  key={card.key}
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
            © 2024 Faz-Tudo Imobiliário. Sistema de Gestão de Ordens de Serviço.
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
            <h1 className="font-display font-bold text-xl text-primary-foreground">Faz-Tudo</h1>
            <p className="text-xs text-primary-foreground/60">Imobiliário</p>
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
              Acesse sua conta de {currentProfile?.title}
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

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Contas são criadas pela administração do sistema.
            </p>
          </div>
        </div>
      </main>

      <footer className="container py-6">
        <p className="text-center text-sm text-primary-foreground/40">
          © 2024 Faz-Tudo Imobiliário. Sistema de Gestão de Ordens de Serviço.
        </p>
      </footer>
    </div>
  );
};

export default AuthPage;