import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OSCard } from '@/components/OSCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, Search, Clock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useServiceOrders, useServiceOrdersRealtime } from '@/hooks/useServiceOrders';

const AprovarOrcamentos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: pendingOrders = [], isLoading } = useServiceOrders('aguardando_aprovacao_admin');
  useServiceOrdersRealtime();

  const filteredOrders = pendingOrders.filter(os => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      os.osNumber.toLowerCase().includes(term) ||
      os.problem.toLowerCase().includes(term) ||
      os.property.address.toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Aprovar Orçamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            {pendingOrders.length} orçamento{pendingOrders.length !== 1 ? 's' : ''} aguardando sua aprovação
          </p>
        </div>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar orçamentos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-4 stagger-children">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div key={order.id} className="os-card border-2 border-accent/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <OSCard order={order} showActions={false} />
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm text-muted-foreground">Custo profissional</p>
                  <p className="text-lg font-bold text-foreground">R$ {order.technicianCost?.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Valor sugerido (+40%)</p>
                  <p className="text-2xl font-bold text-accent">R$ {order.finalPrice?.toFixed(2) || (order.technicianCost ? (order.technicianCost * 1.4).toFixed(2) : '0.00')}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Clock className="h-4 w-4" />
                    {order.estimatedDeadline} {order.estimatedDeadline === 1 ? 'dia' : 'dias'}
                  </div>
                  <Button variant="default" className="mt-3" asChild>
                    <a href={`/ordens/${order.id}`}>
                      <DollarSign className="h-4 w-4" />
                      Revisar Preço
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="os-card text-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum orçamento pendente de aprovação</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AprovarOrcamentos;
