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
import { useDashboardStats, useServiceOrders, useServiceOrdersRealtime } from '@/hooks/useServiceOrders';

const Dashboard = () => {
  const { user, profile, role, isLoading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: allOrders = [], isLoading: ordersLoading } = useServiceOrders();
  useServiceOrdersRealtime();

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !profile || !role) return null;

  const isLoading = statsLoading || ordersLoading;

  // Get recent orders based on role
  const recentOrders = (() => {
    if (role === 'admin') {
      return allOrders.filter(os => os.status === 'aguardando_aprovacao_admin').slice(0, 3);
    }
    return allOrders.slice(0, 3);
  })();

  const currentStats = stats || { total: 0, pending: 0, inProgress: 0, completed: 0, thisMonth: 0 };

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
              <StatCard title="Total de OS" value={isLoading ? '...' : currentStats.total} icon={ClipboardList} />
              <StatCard title="Em Andamento" value={isLoading ? '...' : currentStats.pending} icon={Clock} variant="primary" />
              <StatCard title="Em Execução" value={isLoading ? '...' : currentStats.inProgress} icon={AlertCircle} />
              <StatCard title="Concluídas" value={isLoading ? '...' : currentStats.completed} icon={CheckCircle2} />
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
              <StatCard title="Aguardando Orçamento" value={isLoading ? '...' : currentStats.pending} icon={Clock} variant="accent" />
              <StatCard title="A Executar" value={isLoading ? '...' : currentStats.inProgress} icon={Wrench} variant="primary" />
              <StatCard title="Concluídos" value={isLoading ? '...' : currentStats.completed} icon={CheckCircle2} />
              <StatCard title="Este Mês" value={isLoading ? '...' : currentStats.thisMonth} icon={TrendingUp} />
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
              <StatCard title="Aguardando Aprovação" value={isLoading ? '...' : currentStats.pending} icon={Clock} variant="accent" />
              <StatCard title="Em Execução" value={isLoading ? '...' : currentStats.inProgress} icon={Wrench} variant="primary" />
              <StatCard title="Concluídas" value={isLoading ? '...' : currentStats.completed} icon={CheckCircle2} />
              <StatCard title="Faturamento" value={isLoading ? '...' : (currentStats.revenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={DollarSign} />
            </div>
          </>
        );
    }
  };

  return (
    <DashboardLayout>
      {renderRoleContent()}

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
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recentOrders.length > 0 ? (
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
