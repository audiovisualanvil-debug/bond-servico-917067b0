import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wrench, Building2, UserCog, Shield } from 'lucide-react';
import { UserRole } from '@/types/serviceOrder';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: UserRole) => {
    login(role);
    navigate('/dashboard');
  };

  const roleCards = [
    {
      role: 'imobiliaria' as UserRole,
      title: 'Imobiliária',
      description: 'Abra chamados e acompanhe o status dos serviços',
      icon: Building2,
      color: 'from-blue-500 to-blue-600',
    },
    {
      role: 'tecnico' as UserRole,
      title: 'Técnico',
      description: 'Receba ordens de serviço e envie orçamentos',
      icon: Wrench,
      color: 'from-teal-500 to-teal-600',
    },
    {
      role: 'admin' as UserRole,
      title: 'Administrador',
      description: 'Gerencie todos os processos e defina preços',
      icon: Shield,
      color: 'from-orange-500 to-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
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

      {/* Main content */}
      <main className="flex-1 container flex flex-col items-center justify-center py-12">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Gestão de Ordens de Serviço
          </h2>
          <p className="text-lg text-primary-foreground/70 max-w-2xl mx-auto">
            Sistema completo para gerenciamento de manutenções imobiliárias.
            Do chamado ao relatório final, tudo em um só lugar.
          </p>
        </div>

        {/* Demo Login Cards */}
        <div className="w-full max-w-4xl">
          <p className="text-center text-primary-foreground/60 mb-6 text-sm font-medium uppercase tracking-wider">
            Acesso Demonstração
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {roleCards.map((card) => (
              <button
                key={card.role}
                onClick={() => handleLogin(card.role)}
                className="group relative overflow-hidden rounded-2xl bg-card p-6 text-left shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${card.color}`} />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} mb-4`}>
                  <card.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg text-card-foreground mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {card.description}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary">
                  Entrar
                  <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-12 rounded-xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 px-6 py-4 max-w-2xl text-center">
          <p className="text-sm text-primary-foreground/80">
            <strong className="text-primary-foreground">Modo Demonstração:</strong> Clique em um perfil para explorar o sistema. 
            Os dados são fictícios e resetam ao sair.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="container py-6">
        <p className="text-center text-sm text-primary-foreground/40">
          © 2024 Faz-Tudo Imobiliário. Sistema de Gestão de Ordens de Serviço.
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
