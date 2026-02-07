import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { OSCard } from '@/components/OSCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Wrench, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useServiceOrders, useServiceOrdersRealtime } from '@/hooks/useServiceOrders';

const MeusServicos = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: allOrders = [], isLoading } = useServiceOrders();
  useServiceOrdersRealtime();

  if (!user) return null;

  const pendingOrders = allOrders.filter(os => os.status === 'aguardando_orcamento');
  const inProgressOrders = allOrders.filter(os => os.status === 'aprovado_aguardando' || os.status === 'em_execucao');
  const completedOrders = allOrders.filter(os => os.status === 'concluido');

  const filterOrders = (orders: typeof allOrders) => {
    if (!searchTerm) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(os =>
      os.osNumber.toLowerCase().includes(term) ||
      os.problem.toLowerCase().includes(term) ||
      os.property.address.toLowerCase().includes(term)
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Meus Serviços</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus orçamentos e execuções</p>
        </div>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar serviços..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Aguardando Orçamento
              {pendingOrders.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-accent text-accent-foreground">{pendingOrders.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="gap-2">
              <Wrench className="h-4 w-4" />
              A Executar
              {inProgressOrders.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">{inProgressOrders.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Concluídos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 stagger-children">
            {filterOrders(pendingOrders).length > 0 ? (
              filterOrders(pendingOrders).map((order) => <OSCard key={order.id} order={order} />)
            ) : (
              <div className="os-card text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum serviço aguardando orçamento</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4 stagger-children">
            {filterOrders(inProgressOrders).length > 0 ? (
              filterOrders(inProgressOrders).map((order) => <OSCard key={order.id} order={order} />)
            ) : (
              <div className="os-card text-center py-12">
                <Wrench className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum serviço para executar no momento</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 stagger-children">
            {filterOrders(completedOrders).length > 0 ? (
              filterOrders(completedOrders).map((order) => <OSCard key={order.id} order={order} />)
            ) : (
              <div className="os-card text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum serviço concluído ainda</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </DashboardLayout>
  );
};

export default MeusServicos;
