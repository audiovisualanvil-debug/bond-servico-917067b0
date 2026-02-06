import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/StatCard';
import { OSCard } from '@/components/OSCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  TrendingUp,
  DollarSign,
  Wrench,
  Loader2
} from 'lucide-react';
import { 
  getImobiliariaStats, 
  getTecnicoStats, 
  getAdminStats,
  mockServiceOrders 
} from '@/data/mockData';

const Dashboard = () => {
  const { user, profile, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !profile || !role) return null;

  // Get stats based on user role
  const getStats = () => {
    switch (role) {
      case 'imobiliaria':
        return getImobiliariaStats(user.id);
      case 'tecnico':
        return getTecnicoStats(user.id);
      case 'admin':
        return getAdminStats();
    }
  };

  const stats = getStats();

  // Get recent orders based on role
  const getRecentOrders = () => {
    switch (role) {
      case 'imobiliaria':
        return mockServiceOrders
          .filter(os => os.imobiliariaId === user.id)
          .slice(0, 3);
      case 'tecnico':
        return mockServiceOrders
          .filter(os => os.tecnicoId === user.id || (os.status === 'aguardando_orcamento' && !os.tecnicoId))
          .slice(0, 3);
      case 'admin':
        return mockServiceOrders
          .filter(os => os.status === 'aguardando_aprovacao_admin')
          .slice(0, 3);
    }
  };

  const recentOrders = getRecentOrders();

  // Render different dashboard content based on role
  const renderRoleContent = () => {
    switch (role) {
      case 'imobiliaria':
        return (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Olá, {profile.name.split(' ')[0]}!
                </h1>
                <p className="text-muted-foreground mt-1">
                  Acompanhe suas ordens de serviço
                </p>
              </div>
              <Button size="lg" asChild>
                <Link to="/novo-chamado">
                  <Plus className="h-5 w-5" />
                  Novo Chamado
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatCard
                title="Total de OS"
                value={stats.total}
                icon={ClipboardList}
              />
              <StatCard
                title="Em Andamento"
                value={stats.pending}
                icon={Clock}
                variant="primary"
              />
              <StatCard
                title="Em Execução"
                value={stats.inProgress}
                icon={AlertCircle}
              />
              <StatCard
                title="Concluídas"
                value={stats.completed}
                icon={CheckCircle2}
              />
            </div>
          </>
        );

      case 'tecnico':
        return (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Olá, {profile.name.split(' ')[0]}!
                </h1>
                <p className="text-muted-foreground mt-1">
                  Seus serviços e orçamentos pendentes
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatCard
                title="Aguardando Orçamento"
                value={stats.pending}
                icon={Clock}
                variant="accent"
              />
              <StatCard
                title="A Executar"
                value={stats.inProgress}
                icon={Wrench}
                variant="primary"
              />
              <StatCard
                title="Concluídos"
                value={stats.completed}
                icon={CheckCircle2}
              />
              <StatCard
                title="Este Mês"
                value={stats.thisMonth}
                icon={TrendingUp}
              />
            </div>
          </>
        );

      case 'admin':
        return (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Painel Administrativo
                </h1>
                <p className="text-muted-foreground mt-1">
                  Visão geral de todas as operações
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatCard
                title="Aguardando Aprovação"
                value={stats.pending}
                icon={Clock}
                variant="accent"
              />
              <StatCard
                title="Em Execução"
                value={stats.inProgress}
                icon={Wrench}
                variant="primary"
              />
              <StatCard
                title="Concluídas"
                value={stats.completed}
                icon={CheckCircle2}
              />
              <StatCard
                title="Faturamento"
                value={`R$ ${(stats.revenue || 0).toLocaleString('pt-BR')}`}
                icon={DollarSign}
              />
            </div>
          </>
        );
    }
  };

  return (
    <DashboardLayout>
      {renderRoleContent()}

      {/* Recent Orders Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {role === 'admin' ? 'Orçamentos Pendentes' : 'Ordens Recentes'}
          </h2>
          <Button variant="ghost" asChild>
            <Link to="/ordens">Ver todas</Link>
          </Button>
        </div>

        <div className="space-y-4 stagger-children">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <OSCard key={order.id} order={order} />
            ))
          ) : (
            <div className="os-card text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma ordem de serviço encontrada
              </p>
              {role === 'imobiliaria' && (
                <Button className="mt-4" asChild>
                  <Link to="/novo-chamado">
                    <Plus className="h-4 w-4" />
                    Abrir Primeiro Chamado
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
