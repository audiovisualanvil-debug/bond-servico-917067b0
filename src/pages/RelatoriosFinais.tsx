import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Download, ExternalLink, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const RelatoriosFinais = () => {
  const { data: orders = [], isLoading } = useServiceOrders('concluido');
  const [search, setSearch] = useState('');

  const completedWithReport = orders.filter(o => o.completionReport);

  const filtered = completedWithReport.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.osNumber.toLowerCase().includes(q) ||
      o.property.address.toLowerCase().includes(q) ||
      o.imobiliaria.name.toLowerCase().includes(q) ||
      (o.tecnico?.name || '').toLowerCase().includes(q) ||
      o.requesterName.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Relatórios Finais</h1>
            <p className="text-muted-foreground mt-1">
              Relatórios de conclusão de serviços ({completedWithReport.length})
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por OS, endereço, imobiliária, técnico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 os-card">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {search ? 'Nenhum relatório encontrado para essa busca.' : 'Nenhum relatório de conclusão disponível.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <div key={order.id} className="os-card border hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display font-bold text-lg text-foreground">{order.osNumber}</h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-foreground mb-1">{order.property.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.property.neighborhood}, {order.property.city}
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
                      <span>
                        <strong>Imobiliária:</strong> {order.imobiliaria.company || order.imobiliaria.name}
                      </span>
                      <span>
                        <strong>Técnico:</strong> {order.tecnico?.name || 'N/A'}
                      </span>
                      <span>
                        <strong>Concluído em:</strong>{' '}
                        {order.completionReport?.completedAt
                          ? format(order.completionReport.completedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : 'N/A'}
                      </span>
                      {order.finalPrice && (
                        <span>
                          <strong>Valor:</strong> R$ {order.finalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/ordens/${order.id}/relatorio`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver Relatório
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/ordens/${order.id}`}>
                        <FileText className="h-3.5 w-3.5" />
                        Detalhe da OS
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RelatoriosFinais;
