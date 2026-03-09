import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_LABELS, OSStatus } from '@/types/serviceOrder';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, ExternalLink, Loader2, Search, Clock, CheckCircle, Wrench, Send, ShieldCheck, FileCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';

const STATUS_ICONS: Record<OSStatus, React.ReactNode> = {
  aguardando_orcamento_prestador: <Clock className="h-4 w-4" />,
  aguardando_aprovacao_admin: <ShieldCheck className="h-4 w-4" />,
  enviado_imobiliaria: <Send className="h-4 w-4" />,
  aprovado_aguardando: <CheckCircle className="h-4 w-4" />,
  em_execucao: <Wrench className="h-4 w-4" />,
  concluido: <FileCheck className="h-4 w-4" />,
};

const RelatoriosFinais = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Always fetch ALL orders for counting, use separate filtered list for display
  const { data: allOrders = [], isLoading } = useServiceOrders();
  const [search, setSearch] = useState('');

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allOrders.length };
    for (const key of Object.keys(STATUS_LABELS)) {
      counts[key] = allOrders.filter(o => o.status === key).length;
    }
    return counts;
  }, [allOrders]);

  const displayOrders = statusFilter === 'all' ? allOrders : allOrders.filter(o => o.status === statusFilter);

  const filtered = displayOrders.filter(o => {
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

        {/* Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors text-center ${
              statusFilter === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/30'
            }`}
          >
            <span className="text-2xl font-bold">{statusCounts.all}</span>
            <span className="text-[10px] leading-tight font-medium">Todas</span>
          </button>
          {(Object.entries(STATUS_LABELS) as [OSStatus, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors text-center ${
                statusFilter === key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {STATUS_ICONS[key]}
                <span className="text-2xl font-bold">{statusCounts[key] || 0}</span>
              </div>
              <span className="text-[10px] leading-tight font-medium">{label}</span>
            </button>
          ))}
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
                    {order.status === 'concluido' && (
                      <Button size="sm" asChild>
                        <Link to={`/ordens/${order.id}/relatorio`}>
                          <FileCheck className="h-3.5 w-3.5" />
                          Relatório Final
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
