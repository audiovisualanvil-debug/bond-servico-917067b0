import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wrench, Building2, Mail, Lock, User, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { AppRole } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signUpSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  role: z.enum(['imobiliaria', 'tecnico']),
  company: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

type SelectedProfile = 'admin' | 'imobiliaria' | 'tecnico' | null;

const profileCards = [
  {
    key: 'admin' as const,
    title: 'Administrador',
    icon: ShieldCheck,
    description: 'Gerencie orçamentos, técnicos e operações',
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    iconColor: 'text-amber-500',
    selectedBorder: 'border-amber-400 bg-amber-500/10',
  },
  {
    key: 'tecnico' as const,
    title: 'Técnico',
    icon: Wrench,
    description: 'Receba OSs, envie orçamentos e relatórios',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/40 hover:border-blue-400',
    iconColor: 'text-blue-500',
    selectedBorder: 'border-blue-400 bg-blue-500/10',
  },
  {
    key: 'imobiliaria' as const,
    title: 'Imobiliária',
    icon: Building2,
    description: 'Abra chamados e aprove serviços',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    iconColor: 'text-emerald-500',
    selectedBorder: 'border-emerald-400 bg-emerald-500/10',
  },
];

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign up form state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpCompany, setSignUpCompany] = useState('');

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
      if (error.message.includes('Invalid login credentials')) {
        toast({ variant: 'destructive', title: 'Erro no login', description: 'Email ou senha incorretos.' });
      } else if (error.message.includes('Email not confirmed')) {
        toast({ variant: 'destructive', title: 'Email não confirmado', description: 'Verifique seu email para confirmar a conta.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro no login', description: error.message });
      }
      return;
    }

    toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
    navigate('/dashboard');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!selectedProfile || selectedProfile === 'admin') return;

    const result = signUpSchema.safeParse({
      name: signUpName,
      email: signUpEmail,
      password: signUpPassword,
      confirmPassword: signUpConfirmPassword,
      role: selectedProfile,
      company: signUpCompany,
    });

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
    const { error } = await signUp(
      signUpEmail,
      signUpPassword,
      signUpName,
      selectedProfile as AppRole,
      selectedProfile === 'imobiliaria' ? signUpCompany : undefined
    );
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({ variant: 'destructive', title: 'Email já cadastrado', description: 'Este email já está em uso. Tente fazer login.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro no cadastro', description: error.message });
      }
      return;
    }

    toast({ title: 'Conta criada!', description: 'Verifique seu email para confirmar a conta, ou faça login diretamente.' });
    setIsLogin(true);
  };

  const handleBack = () => {
    setSelectedProfile(null);
    setIsLogin(true);
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
                  <div className="text-left">
                    <h3 className="font-display font-semibold text-lg text-foreground">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                  <ArrowLeft className="ml-auto h-5 w-5 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
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

  // ─── LOGIN / SIGNUP FORM ───
  const canSignUp = selectedProfile !== 'admin';

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
          {/* Back button + profile badge */}
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
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </h2>
            <p className="text-primary-foreground/70">
              {isLogin
                ? `Acesse sua conta de ${currentProfile?.title}`
                : `Cadastre-se como ${currentProfile?.title}`}
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-xl p-8">
            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-10" />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-10" />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : 'Entrar'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" type="text" placeholder="Seu nome" value={signUpName} onChange={(e) => setSignUpName(e.target.value)} className="pl-10" />
                  </div>
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} className="pl-10" />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                {selectedProfile === 'imobiliaria' && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Nome da Imobiliária</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="company" type="text" placeholder="Imobiliária XYZ" value={signUpCompany} onChange={(e) => setSignUpCompany(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-password" type="password" placeholder="••••••••" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} className="pl-10" />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm-password" type="password" placeholder="••••••••" value={signUpConfirmPassword} onChange={(e) => setSignUpConfirmPassword(e.target.value)} className="pl-10" />
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</> : 'Criar Conta'}
                </Button>
              </form>
            )}

            {canSignUp && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
                  className="text-sm text-primary hover:underline"
                >
                  {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                </button>
              </div>
            )}

            {!canSignUp && !isLogin && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Contas de administrador são criadas internamente.
              </p>
            )}
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
