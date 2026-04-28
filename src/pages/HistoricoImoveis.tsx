import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatPhone } from '@/components/ui/phone-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, MapPin, History, CheckCircle2, Clock, ChevronRight, Building2, Loader2, FileText,
  FilePlus2, DollarSign, ShieldCheck, Send, ThumbsUp, Wrench, Save, BookmarkCheck,
  ChevronLeft, User, ExternalLink, Link2, Download, CalendarRange, Columns3
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useProperties } from '@/hooks/useProperties';
import { useServiceOrders, useServiceOrdersRealtime } from '@/hooks/useServiceOrders';
import { StatusBadge } from '@/components/StatusBadge';
import type { ServiceOrder, OSStatus } from '@/types/serviceOrder';
import { STATUS_LABELS } from '@/types/serviceOrder';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodKey = 'all' | '7d' | '4w' | '3m' | '12m' | 'custom';
const PERIOD_LABELS: Record<PeriodKey, string> = {
  all: 'Todo o período',
  '7d': 'Últimos 7 dias',
  '4w': 'Últimas 4 semanas',
  '3m': 'Últimos 3 meses',
  '12m': 'Últimos 12 meses',
  custom: 'Intervalo personalizado',
};

type DateField = 'createdAt' | 'quoteSentAt' | 'adminApprovedAt' | 'clientApprovedAt' | 'executionStartedAt' | 'completedAt';
const DATE_FIELD_LABELS: Record<DateField, string> = {
  createdAt: 'Abertura do chamado',
  quoteSentAt: 'Orçamento enviado',
  adminApprovedAt: 'Aprovado pelo dono/admin',
  clientApprovedAt: 'Aprovado pela imobiliária',
  executionStartedAt: 'Execução iniciada',
  completedAt: 'Conclusão',
};

const periodCutoff = (key: PeriodKey): Date | null => {
  if (key === 'all' || key === 'custom') return null;
  const now = new Date();
  const map: Record<Exclude<PeriodKey, 'all' | 'custom'>, number> = { '7d': 7, '4w': 28, '3m': 90, '12m': 365 };
  const d = new Date(now);
  d.setDate(d.getDate() - map[key]);
  return d;
};

type ColumnKey = 'osNumber' | 'problem' | 'requester' | 'status' | 'dates' | 'price';
const COLUMN_LABELS: Record<ColumnKey, string> = {
  osNumber: 'Nº da OS',
  problem: 'Problema',
  requester: 'Solicitante',
  status: 'Status',
  dates: 'Linha do tempo / datas',
  price: 'Valor final',
};
const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  osNumber: true, problem: true, requester: true, status: true, dates: true, price: true,
};

const formatDateTime = (d?: Date) =>
  d ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const formatDateShort = (d?: Date) =>
  d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

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
  // Realtime: invalidate service-orders cache on any change so counters/timeline update without reload.
  useServiceOrdersRealtime();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'all'>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodKey>('all');
  const [dateField, setDateField] = useState<DateField>('createdAt');
  const [hasSavedDefault, setHasSavedDefault] = useState(false);
  const [orderQuery, setOrderQuery] = useState('');
  const [requesterQuery, setRequesterQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const prefsKey = user ? `historicoImoveis:filters:${user.id}` : null;

  // Load saved defaults on mount / user change
  useEffect(() => {
    if (!prefsKey) return;
    try {
      const raw = localStorage.getItem(prefsKey);
      if (!raw) { setHasSavedDefault(false); return; }
      const parsed = JSON.parse(raw) as { statusFilter?: OSStatus | 'all'; periodFilter?: PeriodKey; dateField?: DateField };
      if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
      if (parsed.periodFilter) setPeriodFilter(parsed.periodFilter);
      if (parsed.dateField) setDateField(parsed.dateField);
      setHasSavedDefault(true);
    } catch {
      setHasSavedDefault(false);
    }
  }, [prefsKey]);

  const saveDefaults = () => {
    if (!prefsKey) return;
    localStorage.setItem(prefsKey, JSON.stringify({ statusFilter, periodFilter, dateField }));
    setHasSavedDefault(true);
    toast.success('Filtros salvos como padrão para o seu usuário');
  };

  const clearDefaults = () => {
    if (!prefsKey) return;
    localStorage.removeItem(prefsKey);
    setHasSavedDefault(false);
    toast.success('Padrão removido');
  };

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
  // Orders filtered by period + base date + search (but NOT by status) — used for status counters
  const ordersBeforeStatus = allPropertyOrders
    .filter(os => {
      if (!cutoff) return true;
      const d = os[dateField] as Date | null | undefined;
      if (!d) return false;
      return d.getTime() >= cutoff.getTime();
    })
    .filter(os => {
      if (!orderQuery.trim()) return true;
      const q = orderQuery.trim().toLowerCase();
      return (
        (os.osNumber ?? '').toLowerCase().includes(q) ||
        (os.problem ?? '').toLowerCase().includes(q) ||
        (os.requesterName ?? '').toLowerCase().includes(q)
      );
    })
    .filter(os => {
      if (!requesterQuery.trim()) return true;
      const q = requesterQuery.trim().toLowerCase();
      return (os.requesterName ?? '').toLowerCase().includes(q);
    });

  const statusCounts = ordersBeforeStatus.reduce<Record<string, number>>((acc, os) => {
    acc[os.status] = (acc[os.status] ?? 0) + 1;
    return acc;
  }, {});

  // Stats per status: count + min/max date based on selected dateField
  const statusStats = ordersBeforeStatus.reduce<Record<string, { count: number; min?: Date; max?: Date }>>((acc, os) => {
    const cur = acc[os.status] ?? { count: 0 };
    cur.count += 1;
    const d = os[dateField] as Date | null | undefined;
    if (d) {
      if (!cur.min || d.getTime() < cur.min.getTime()) cur.min = d;
      if (!cur.max || d.getTime() > cur.max.getTime()) cur.max = d;
    }
    acc[os.status] = cur;
    return acc;
  }, {});

  const allStats = (() => {
    let min: Date | undefined, max: Date | undefined;
    for (const os of ordersBeforeStatus) {
      const d = os[dateField] as Date | null | undefined;
      if (!d) continue;
      if (!min || d.getTime() < min.getTime()) min = d;
      if (!max || d.getTime() > max.getTime()) max = d;
    }
    return { count: ordersBeforeStatus.length, min, max };
  })();

  const buildTooltip = (s: { count: number; min?: Date; max?: Date }) => {
    const base = DATE_FIELD_LABELS[dateField].toLowerCase();
    if (s.count === 0) return 'Nenhuma OS no período';
    if (!s.min || !s.max) return `${s.count} OS · sem datas no período (base: ${base})`;
    if (s.min.getTime() === s.max.getTime()) return `${s.count} OS · ${formatDateShort(s.min)} (base: ${base})`;
    return `${s.count} OS · de ${formatDateShort(s.min)} até ${formatDateShort(s.max)} (base: ${base})`;
  };

  const propertyOrders = ordersBeforeStatus
    .filter(os => statusFilter === 'all' || os.status === statusFilter)
    .sort((a, b) => {
      const da = (a[dateField] as Date | null | undefined)?.getTime() ?? a.createdAt.getTime();
      const db = (b[dateField] as Date | null | undefined)?.getTime() ?? b.createdAt.getTime();
      return db - da;
    });
  const filtersActive = statusFilter !== 'all' || periodFilter !== 'all' || dateField !== 'createdAt';

  const totalPages = Math.max(1, Math.ceil(propertyOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = propertyOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset pagination when filters/search/property change
  useEffect(() => {
    setPage(1);
  }, [selectedPropertyId, statusFilter, periodFilter, dateField, orderQuery, requesterQuery]);

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
    <TooltipProvider delayDuration={150}>
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
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      <h3 className="font-display font-semibold">Histórico de Serviços</h3>
                      <span className="text-xs text-muted-foreground">
                        ({propertyOrders.length} de {allPropertyOrders.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OSStatus | 'all')}>
                        <SelectTrigger className="h-9 w-[260px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <span className="flex items-center justify-between gap-3 w-full">
                              <span>Todos os status</span>
                              <span className="text-xs text-muted-foreground">{ordersBeforeStatus.length}</span>
                            </span>
                          </SelectItem>
                          {(Object.keys(STATUS_LABELS) as OSStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              <span className="flex items-center justify-between gap-3 w-full">
                                <span>{STATUS_LABELS[s]}</span>
                                <span className="text-xs text-muted-foreground">{statusCounts[s] ?? 0}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodKey)}>
                        <SelectTrigger className="h-9 w-[180px]">
                          <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => (
                            <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={dateField} onValueChange={(v) => setDateField(v as DateField)}>
                        <SelectTrigger className="h-9 w-[220px]" title="Base de data para o filtro de período">
                          <SelectValue placeholder="Base de data" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(DATE_FIELD_LABELS) as DateField[]).map((f) => (
                            <SelectItem key={f} value={f}>Por: {DATE_FIELD_LABELS[f]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filtersActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setStatusFilter('all'); setPeriodFilter('all'); setDateField('createdAt'); }}
                        >
                          Limpar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveDefaults}
                        title="Salvar filtros atuais como padrão para seu usuário"
                      >
                        {hasSavedDefault ? <BookmarkCheck className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        {hasSavedDefault ? 'Atualizar padrão' : 'Salvar como padrão'}
                      </Button>
                      {hasSavedDefault && (
                        <Button variant="ghost" size="sm" onClick={clearDefaults} title="Remover padrão salvo">
                          Remover padrão
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            statusFilter === 'all'
                              ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                              : 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80'
                          }`}
                        >
                          Todos <span className="ml-1 font-semibold">{ordersBeforeStatus.length}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{buildTooltip(allStats)}</TooltipContent>
                    </Tooltip>
                    {(Object.keys(STATUS_LABELS) as OSStatus[]).map((s) => {
                      const count = statusCounts[s] ?? 0;
                      const active = statusFilter === s;
                      return (
                        <Tooltip key={s}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setStatusFilter(active ? 'all' : s)}
                              disabled={count === 0 && !active}
                              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                                active
                                  ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                                  : count === 0
                                    ? 'bg-secondary/40 border-border text-muted-foreground/50 cursor-not-allowed'
                                    : 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80'
                              }`}
                            >
                              {STATUS_LABELS[s]} <span className="ml-1 font-semibold">{count}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{buildTooltip(statusStats[s] ?? { count: 0 })}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>

                  {propertyOrders.length > 0 ? (
                    <>
                    <div className="grid gap-2 md:grid-cols-2 mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar nesta lista (nº OS, problema, solicitante)..."
                          value={orderQuery}
                          onChange={(e) => setOrderQuery(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Filtrar por nome do solicitante..."
                          value={requesterQuery}
                          onChange={(e) => setRequesterQuery(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {paginatedOrders.map((order) => {
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
                    {propertyOrders.length > PAGE_SIZE && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–
                          {Math.min(currentPage * PAGE_SIZE, propertyOrders.length)} de {propertyOrders.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" /> Anterior
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Página {currentPage} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Próxima <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {allPropertyOrders.length === 0
                        ? 'Nenhum serviço registrado para este imóvel'
                        : orderQuery
                          ? `Nenhuma OS encontrada para "${orderQuery}"`
                          : requesterQuery
                            ? `Nenhuma OS encontrada para o solicitante "${requesterQuery}"`
                            : `Nenhuma OS com ${DATE_FIELD_LABELS[dateField].toLowerCase()} no período selecionado`}
                    </p>
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
    </TooltipProvider>
    </DashboardLayout>
  );
};

export default HistoricoImoveis;
