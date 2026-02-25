import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_LABELS } from '@/types/serviceOrder';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, ExternalLink, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const RelatoriosFinais = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: orders = [], isLoading } = useServiceOrders(statusFilter === 'all' ? undefined : statusFilter);
  const [search, setSearch] = useState('');

  const filtered = orders.filter(o => {
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
              Todas as ordens de serviço ({filtered.length})
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OS, endereço, imobiliária, técnico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 os-card">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {search || statusFilter !== 'all' ? 'Nenhuma OS encontrada para esses filtros.' : 'Nenhuma ordem de serviço disponível.'}
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
                        <strong>Criado em:</strong>{' '}
                        {format(order.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {order.finalPrice && (
                        <span>
                          <strong>Valor:</strong> R$ {order.finalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {order.completionReport && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/ordens/${order.id}/relatorio`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver Relatório
                        </Link>
                      </Button>
                    )}
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
