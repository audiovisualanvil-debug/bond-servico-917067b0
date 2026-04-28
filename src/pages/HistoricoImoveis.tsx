import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatPhone } from '@/components/ui/phone-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, MapPin, History, CheckCircle2, Clock, ChevronRight, Building2, Loader2, FileText,
  FilePlus2, DollarSign, ShieldCheck, Send, ThumbsUp, Wrench
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useProperties } from '@/hooks/useProperties';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { StatusBadge } from '@/components/StatusBadge';
import type { ServiceOrder, OSStatus } from '@/types/serviceOrder';
import { STATUS_LABELS } from '@/types/serviceOrder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PeriodKey = 'all' | '7d' | '4w' | '3m' | '12m';
const PERIOD_LABELS: Record<PeriodKey, string> = {
  all: 'Todo o período',
  '7d': 'Últimos 7 dias',
  '4w': 'Últimas 4 semanas',
  '3m': 'Últimos 3 meses',
  '12m': 'Últimos 12 meses',
};
const periodCutoff = (key: PeriodKey): Date | null => {
  if (key === 'all') return null;
  const now = new Date();
  const map: Record<Exclude<PeriodKey, 'all'>, number> = { '7d': 7, '4w': 28, '3m': 90, '12m': 365 };
  const d = new Date(now);
  d.setDate(d.getDate() - map[key]);
  return d;
};

const formatDateTime = (d?: Date) =>
  d ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

type StepIcon = typeof FilePlus2;

const buildOrderTimeline = (order: ServiceOrder) => {
  const steps: { key: string; label: string; date?: Date; icon: StepIcon; color: string }[] = [
    { key: 'created', label: 'Chamado aberto', date: order.createdAt, icon: FilePlus2, color: 'text-blue-600 bg-blue-500/10' },
    { key: 'quote', label: 'Orçamento do profissional enviado', date: order.quoteSentAt, icon: DollarSign, color: 'text-purple-600 bg-purple-500/10' },
    { key: 'admin', label: 'Aprovado pelo dono / Admin', date: order.adminApprovedAt, icon: ShieldCheck, color: 'text-indigo-600 bg-indigo-500/10' },
    { key: 'sent', label: 'Enviado à imobiliária', date: order.adminApprovedAt, icon: Send, color: 'text-cyan-600 bg-cyan-500/10' },
    { key: 'client', label: 'Aprovado pela imobiliária', date: order.clientApprovedAt, icon: ThumbsUp, color: 'text-teal-600 bg-teal-500/10' },
    { key: 'execution', label: 'Execução iniciada', date: order.executionStartedAt, icon: Wrench, color: 'text-orange-600 bg-orange-500/10' },
    { key: 'completed', label: 'Concluído', date: order.completedAt, icon: CheckCircle2, color: 'text-green-600 bg-green-500/10' },
  ];
  // Hide "Enviado" if it duplicates "Aprovado pelo dono" timestamp visually but show both labels distinctly only when there's something between
  return steps;
};

const HistoricoImoveis = () => {
  const { user, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'all'>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodKey>('all');

  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: allOrders = [], isLoading: ordersLoading } = useServiceOrders();

  if (!user || !role) return null;

  const filteredProperties = properties.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.address.toLowerCase().includes(term) ||
      p.neighborhood.toLowerCase().includes(term) ||
      p.city.toLowerCase().includes(term)
    );
  });

  const cutoff = periodCutoff(periodFilter);
  const allPropertyOrders = selectedPropertyId
    ? allOrders.filter(os => os.propertyId === selectedPropertyId)
    : [];
  const propertyOrders = allPropertyOrders
    .filter(os => statusFilter === 'all' || os.status === statusFilter)
    .filter(os => !cutoff || os.createdAt.getTime() >= cutoff.getTime())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const filtersActive = statusFilter !== 'all' || periodFilter !== 'all';

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const getPropertyStats = (propertyId: string) => {
    const orders = allOrders.filter(os => os.propertyId === propertyId);
    return {
      total: orders.length,
      completed: orders.filter(os => os.status === 'concluido').length,
      pending: orders.filter(os => os.status !== 'concluido').length,
    };
  };

  const isLoading = propertiesLoading || ordersLoading;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Histórico por Imóvel</h1>
          <p className="text-muted-foreground mt-1">Visualize todo o histórico de manutenções de cada imóvel</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="os-card h-full">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold">Imóveis</h2>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar imóvel..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredProperties.map((property) => {
                  const stats = getPropertyStats(property.id);
                  const isSelected = selectedPropertyId === property.id;
                  return (
                    <button
                      key={property.id}
                      onClick={() => setSelectedPropertyId(property.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{property.address}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{property.neighborhood}, {property.city}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {stats.total > 0 && <span className="text-xs text-muted-foreground">{stats.total} OS</span>}
                          <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredProperties.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum imóvel encontrado</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedProperty ? (
              <div className="space-y-6">
                <div className="os-card">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-display font-bold text-xl text-foreground">{selectedProperty.address}</h2>
                      <p className="text-muted-foreground">{selectedProperty.neighborhood}, {selectedProperty.city} - {selectedProperty.state}</p>
                      {selectedProperty.zipCode && <p className="text-sm text-muted-foreground mt-1">CEP: {selectedProperty.zipCode}</p>}
                      {(selectedProperty.tenantName || selectedProperty.ownerName) && (
                        <div className="mt-2 space-y-1">
                          {selectedProperty.tenantName && (
                            <p className="text-sm text-muted-foreground">
                              Inquilino: {selectedProperty.tenantName}
                              {selectedProperty.tenantPhone && ` • ${formatPhone(selectedProperty.tenantPhone)}`}
                            </p>
                          )}
                          {selectedProperty.ownerName && (
                            <p className="text-sm text-muted-foreground">
                              Proprietário: {selectedProperty.ownerName}
                              {selectedProperty.ownerPhone && ` • ${formatPhone(selectedProperty.ownerPhone)}`}
                              {selectedProperty.ownerEmail && ` • ${selectedProperty.ownerEmail}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <p className="text-2xl font-bold text-foreground">{getPropertyStats(selectedProperty.id).total}</p>
                      <p className="text-xs text-muted-foreground">Total de OS</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10">
                      <p className="text-2xl font-bold text-green-600">{getPropertyStats(selectedProperty.id).completed}</p>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                      <p className="text-2xl font-bold text-yellow-600">{getPropertyStats(selectedProperty.id).pending}</p>
                      <p className="text-xs text-muted-foreground">Em Andamento</p>
                    </div>
                  </div>
                </div>

                <div className="os-card">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold">Histórico de Serviços</h3>
                  </div>

                  {propertyOrders.length > 0 ? (
                    <div className="space-y-4">
                      {propertyOrders.map((order) => {
                        const steps = buildOrderTimeline(order);
                        return (
                          <div key={order.id} className="border border-border rounded-lg p-4 bg-card">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-primary">{order.osNumber}</span>
                                <StatusBadge status={order.status} />
                              </div>
                              <div className="flex items-center gap-3">
                                {order.finalPrice && role !== 'tecnico' && (
                                  <span className="text-sm font-semibold text-foreground">R$ {order.finalPrice.toFixed(2)}</span>
                                )}
                                <Button variant="link" className="p-0 h-auto text-xs" asChild>
                                  <Link to={`/ordens/${order.id}`}>Ver detalhes →</Link>
                                </Button>
                                {order.status === 'concluido' && order.completionReport && (
                                  <Button variant="link" className="p-0 h-auto text-xs text-status-completed" asChild>
                                    <Link to={`/ordens/${order.id}/relatorio`}>
                                      <FileText className="h-3 w-3" /> Relatório
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-foreground mb-4">{order.problem}</p>

                            <ol className="relative space-y-3 pl-2">
                              {steps.map((step, i) => {
                                const Icon = step.icon;
                                const done = !!step.date;
                                return (
                                  <li key={step.key} className="relative pl-8">
                                    {i < steps.length - 1 && (
                                      <span className={`absolute left-[11px] top-6 bottom-[-12px] w-0.5 ${done ? 'bg-border' : 'bg-border/40'}`} />
                                    )}
                                    <span
                                      className={`absolute left-0 top-0.5 h-6 w-6 rounded-full flex items-center justify-center ${
                                        done ? step.color : 'bg-muted text-muted-foreground/50'
                                      }`}
                                    >
                                      <Icon className="h-3.5 w-3.5" />
                                    </span>
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                      <p className={`text-sm ${done ? 'text-foreground font-medium' : 'text-muted-foreground/70'}`}>
                                        {step.label}
                                      </p>
                                      <p className={`text-xs ${done ? 'text-muted-foreground' : 'text-muted-foreground/50 italic'}`}>
                                        {done ? formatDateTime(step.date) : 'pendente'}
                                      </p>
                                    </div>
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum serviço registrado para este imóvel</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="os-card h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Selecione um imóvel para ver o histórico</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default HistoricoImoveis;
