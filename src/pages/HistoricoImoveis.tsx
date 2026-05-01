import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatPhone } from '@/components/ui/phone-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, MapPin, History, CheckCircle2, Clock, ChevronRight, Building2, Loader2, FileText,
  FilePlus2, DollarSign, ShieldCheck, Send, ThumbsUp, Wrench, Save, BookmarkCheck,
  ChevronLeft, User, ExternalLink, Link2, Download, CalendarRange, Columns3, Hash, RotateCcw,
   ArrowUpDown, Home, Bookmark, AlertCircle, RefreshCcw, Printer
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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

type SortKey =
  | 'createdAt_desc' | 'createdAt_asc'
  | 'completedAt_desc' | 'completedAt_asc'
  | 'price_desc' | 'price_asc';
const SORT_LABELS: Record<SortKey, string> = {
  createdAt_desc: 'Abertura (mais recente)',
  createdAt_asc: 'Abertura (mais antiga)',
  completedAt_desc: 'Conclusão (mais recente)',
  completedAt_asc: 'Conclusão (mais antiga)',
  price_desc: 'Valor (maior → menor)',
  price_asc: 'Valor (menor → maior)',
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
  const [osNumberQuery, setOsNumberQuery] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [neighborhoodQuery, setNeighborhoodQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [zipCodeQuery, setZipCodeQuery] = useState('');
  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const [exportScope, setExportScope] = useState<'page' | 'all'>('all');
  const [exportStatus, setExportStatus] = useState<OSStatus | 'all'>('all');
  const [exportResponsible, setExportResponsible] = useState<string>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt_desc');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewProperty, setPreviewProperty] = useState<any>(null);
  const navigate = useNavigate();

  const prefsKey = user ? `historicoImoveis:filters:${user.id}` : null;
  const colsKey = user ? `historicoImoveis:columns:${user.id}` : null;
   const sortKeyStorage = user ? `historicoImoveis:sort:${user.id}` : null;
   const addressKey = user ? `historicoImoveis:address:${user.id}` : null;
   const exportScopeKey = user ? `historicoImoveis:exportScope:${user.id}` : null;

  // Load saved address filters (text + neighborhood + city)
  useEffect(() => {
    if (!addressKey) return;
    try {
      const raw = localStorage.getItem(addressKey);
      if (!raw) { setHasSavedAddress(false); return; }
      const parsed = JSON.parse(raw) as { addressQuery?: string; neighborhoodQuery?: string; cityQuery?: string; zipCodeQuery?: string };
      if (parsed.addressQuery) setAddressQuery(parsed.addressQuery);
      if (parsed.neighborhoodQuery) setNeighborhoodQuery(parsed.neighborhoodQuery);
      if (parsed.cityQuery) setCityQuery(parsed.cityQuery);
      if (parsed.zipCodeQuery) setZipCodeQuery(parsed.zipCodeQuery);
      setHasSavedAddress(true);
    } catch {
      setHasSavedAddress(false);
    }
  }, [addressKey]);

  const saveAddressFilter = () => {
    if (!addressKey) return;
    localStorage.setItem(addressKey, JSON.stringify({ addressQuery, neighborhoodQuery, cityQuery, zipCodeQuery }));
    setHasSavedAddress(true);
    toast.success('Filtro de endereço salvo — será restaurado nos próximos acessos');
  };

  const clearAddressFilter = () => {
    setAddressQuery(''); setNeighborhoodQuery(''); setCityQuery(''); setZipCodeQuery('');
    if (addressKey) localStorage.removeItem(addressKey);
    setHasSavedAddress(false);
    toast.success('Filtro de endereço limpo');
  };

  // Load saved defaults on mount / user change
  useEffect(() => {
    if (!prefsKey) return;
    try {
      const raw = localStorage.getItem(prefsKey);
      if (!raw) { setHasSavedDefault(false); return; }
      const parsed = JSON.parse(raw) as { statusFilter?: OSStatus | 'all'; periodFilter?: PeriodKey; dateField?: DateField; customStart?: string; customEnd?: string };
      if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
      if (parsed.periodFilter) setPeriodFilter(parsed.periodFilter);
      if (parsed.dateField) setDateField(parsed.dateField);
      if (parsed.customStart) setCustomStart(new Date(parsed.customStart));
      if (parsed.customEnd) setCustomEnd(new Date(parsed.customEnd));
      setHasSavedDefault(true);
    } catch {
      setHasSavedDefault(false);
    }
  }, [prefsKey]);

  // Load saved columns
  useEffect(() => {
    if (!colsKey) return;
    try {
      const raw = localStorage.getItem(colsKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, boolean>>;
      setColumns({ ...DEFAULT_COLUMNS, ...parsed });
    } catch { /* ignore */ }
  }, [colsKey]);

  // Load saved sort
  useEffect(() => {
    if (!sortKeyStorage) return;
    try {
      const raw = localStorage.getItem(sortKeyStorage);
      if (raw && raw in SORT_LABELS) setSortKey(raw as SortKey);
    } catch { /* ignore */ }
   }, [sortKeyStorage]);

   // Load saved export scope
   useEffect(() => {
     if (!exportScopeKey) return;
     try {
       const raw = localStorage.getItem(exportScopeKey);
       if (raw === 'page' || raw === 'all') setExportScope(raw);
     } catch { /* ignore */ }
   }, [exportScopeKey]);

  const updateSort = (k: SortKey) => {
    setSortKey(k);
    if (sortKeyStorage) localStorage.setItem(sortKeyStorage, k);
   };

   const updateExportScope = (v: 'page' | 'all') => {
     setExportScope(v);
     if (exportScopeKey) localStorage.setItem(exportScopeKey, v);
   };

  const toggleColumn = (k: ColumnKey, value: boolean) => {
    setColumns(prev => {
      const next = { ...prev, [k]: value };
      if (colsKey) localStorage.setItem(colsKey, JSON.stringify(next));
      return next;
    });
  };

  const resetColumnsToDefault = () => {
    setColumns(DEFAULT_COLUMNS);
    if (colsKey) localStorage.setItem(colsKey, JSON.stringify(DEFAULT_COLUMNS));
    toast.success('Colunas padrão restauradas e salvas');
  };

  const saveDefaults = () => {
    if (!prefsKey) return;
    localStorage.setItem(prefsKey, JSON.stringify({
      statusFilter, periodFilter, dateField,
      customStart: customStart?.toISOString(),
      customEnd: customEnd?.toISOString(),
    }));
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
      const d = os[dateField] as Date | null | undefined;
      if (periodFilter === 'custom') {
        if (!customStart && !customEnd) return true;
        if (!d) return false;
        if (customStart && d.getTime() < customStart.getTime()) return false;
        if (customEnd) {
          // include the full end day
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          if (d.getTime() > end.getTime()) return false;
        }
        return true;
      }
      if (!cutoff) return true;
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
    })
    .filter(os => {
      const q = osNumberQuery.trim();
      if (!q) return true;
      // Match digits only against os number digits — works whether user types "1023" or "OS-1023"
      const onlyDigits = q.replace(/\D/g, '');
      const osDigits = (os.osNumber ?? '').replace(/\D/g, '');
      if (onlyDigits) return osDigits.includes(onlyDigits);
      return (os.osNumber ?? '').toLowerCase().includes(q.toLowerCase());
    })
    .filter(os => {
      const q = addressQuery.trim().toLowerCase();
      if (!q) return true;
      const p = os.property;
      if (!p) return false;
      const haystack = [p.address, p.neighborhood, p.city, p.state, p.zipCode, p.code]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    })
    .filter(os => {
      const q = neighborhoodQuery.trim().toLowerCase();
      if (!q) return true;
      return (os.property?.neighborhood ?? '').toLowerCase().includes(q);
    })
    .filter(os => {
      const q = cityQuery.trim().toLowerCase();
      if (!q) return true;
      return (os.property?.city ?? '').toLowerCase().includes(q);
    })
    .filter(os => {
      const q = zipCodeQuery.trim().toLowerCase();
      if (!q) return true;
      return (os.property?.zipCode ?? '').toLowerCase().includes(q);
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
      const FAR_PAST = -Infinity;
      const FAR_FUTURE = Infinity;
      switch (sortKey) {
        case 'createdAt_asc':  return a.createdAt.getTime() - b.createdAt.getTime();
        case 'createdAt_desc': return b.createdAt.getTime() - a.createdAt.getTime();
        case 'completedAt_desc': {
          const ta = a.completedAt?.getTime() ?? FAR_PAST;
          const tb = b.completedAt?.getTime() ?? FAR_PAST;
          return tb - ta;
        }
        case 'completedAt_asc': {
          const ta = a.completedAt?.getTime() ?? FAR_FUTURE;
          const tb = b.completedAt?.getTime() ?? FAR_FUTURE;
          return ta - tb;
        }
        case 'price_desc': return (b.finalPrice ?? -Infinity) - (a.finalPrice ?? -Infinity);
        case 'price_asc':  return (a.finalPrice ?? Infinity) - (b.finalPrice ?? Infinity);
        default: return 0;
      }
    });
  const filtersActive = statusFilter !== 'all' || periodFilter !== 'all' || dateField !== 'createdAt' || !!customStart || !!customEnd;

  const copyOrderLink = async (order: ServiceOrder) => {
    const url = `${window.location.origin}/ordens/${order.id}`;
    const text = `${order.osNumber ?? order.id} — ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link da OS copiado');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  const copyPropertyLink = async (order: ServiceOrder) => {
    const prop = order.property;
    const fullAddress = prop
      ? `${prop.address}, ${prop.neighborhood}, ${prop.city} - ${prop.state}${prop.zipCode ? ` (CEP ${prop.zipCode})` : ''}`
      : '';
    const url = `${window.location.origin}/historico-imoveis?propertyId=${order.propertyId}`;
    const text = fullAddress ? `${fullAddress} — ${url}` : url;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link do imóvel copiado');
    } catch {
      toast.error('Não foi possível copiar o link do imóvel');
    }
  };

   const generatePdfHtml = (targetProperty: any) => {
      const uniqueResponsibles = Array.from(new Set(propertyOrders.map(o => o.tecnico?.name).filter(Boolean))) as string[];
      const responsibleLabel = exportResponsible === 'all' ? 'Todos' : exportResponsible;

     const periodLabel = periodFilter === 'custom'
        ? `${customStart ? format(customStart, 'dd/MM/yyyy', { locale: ptBR }) : '—'} a ${customEnd ? format(customEnd, 'dd/MM/yyyy', { locale: ptBR }) : '—'}`
        : PERIOD_LABELS[periodFilter];
      const statusLabel = statusFilter === 'all' ? 'Todos' : STATUS_LABELS[statusFilter];
       const sortLabel = SORT_LABELS[sortKey];
        const exportStatusLabel = exportStatus === 'all' ? 'Todos' : STATUS_LABELS[exportStatus];
      const esc = (s: string) => s.replace(/</g, '&lt;');
      const td = (content: string, extra = '') =>
        `<td style="padding:6px;border:1px solid #ddd;${extra}">${content}</td>`;
      const th = (label: string) =>
        `<th style="padding:6px;border:1px solid #ddd;text-align:left;">${label}</th>`;
      // Build header + row cells in the same order, respecting selected columns
      const colDefs: { key: ColumnKey; header: string; cell: (o: ServiceOrder) => string }[] = [
        { key: 'osNumber', header: 'Nº OS', cell: o => td(esc(o.osNumber ?? '-'), 'font-weight:600;color:#1a56db;') },
        { key: 'problem',  header: 'Problema', cell: o => td(esc(o.problem ?? '-')) },
        { key: 'requester', header: 'Solicitante', cell: o => td(esc(o.requesterName ?? '-')) },
        { key: 'status', header: 'Status', cell: o => td(STATUS_LABELS[o.status]) },
        { key: 'dates', header: `Datas (${DATE_FIELD_LABELS[dateField]})`, cell: o => {
          const opened = formatDateShort(o.createdAt);
          const done = o.completedAt ? formatDateShort(o.completedAt) : '-';
          return td(`Aberto: ${opened}<br/>Concluído: ${done}`);
        }},
        { key: 'price', header: 'Valor', cell: o => td(o.finalPrice ? 'R$ ' + o.finalPrice.toFixed(2) : '-') },
      ];
      const activeCols = colDefs.filter(c => columns[c.key]);
      const colCount = Math.max(1, activeCols.length);
      const headerHtml = activeCols.map(c => th(c.header)).join('');
       // Base rows to export: either the paginated ones or all that match current filters
       let baseRows = exportScope === 'page' ? paginatedOrders : propertyOrders;

        // Apply multiple export-specific filters
        let exportRows = baseRows;
        
        if (exportStatus !== 'all') {
          exportRows = exportRows.filter(o => o.status === exportStatus);
        }
        
        if (exportResponsible !== 'all') {
          exportRows = exportRows.filter(o => o.tecnico?.name === exportResponsible);
        }

      const scopeLabel = exportScope === 'page'
        ? `Página atual (${currentPage} de ${totalPages})`
        : 'Todos os filtrados';
      const rows = exportRows.map(o => `<tr>${activeCols.map(c => c.cell(o)).join('')}</tr>`).join('');
       return `
        <div style="font-family: Arial, sans-serif; padding:24px; color:#111; background: white;">
            <h1 style="margin:0 0 4px 0; font-size:20px;">Histórico de OS — ${targetProperty.address}</h1>
            <p style="margin:0 0 12px 0; color:#555; font-size:12px;">
              ${targetProperty.neighborhood}, ${targetProperty.city} - ${targetProperty.state}
            </p>
           <p style="margin:0 0 12px 0; font-size:12px;">
             <strong>Período:</strong> ${periodLabel} (base: ${DATE_FIELD_LABELS[dateField]}) ·
              <strong>Filtro Tela (Status):</strong> ${statusLabel} ·
              <strong>Filtro Exportação (Status):</strong> ${exportStatusLabel} ·
              <strong>Filtro Exportação (Responsável):</strong> ${responsibleLabel} ·
             <strong>Ordenação:</strong> ${sortKey ? SORT_LABELS[sortKey] : '-'} ·
             <strong>Escopo:</strong> ${scopeLabel} ·
             <strong>Total exportado:</strong> ${exportRows.length} de ${propertyOrders.length} OS
             ${orderQuery ? ` · <strong>Busca:</strong> "${orderQuery}"` : ''}
             ${requesterQuery ? ` · <strong>Solicitante:</strong> "${requesterQuery}"` : ''}
             ${osNumberQuery ? ` · <strong>Nº OS:</strong> "${osNumberQuery}"` : ''}
             ${addressQuery ? ` · <strong>Endereço:</strong> "${addressQuery}"` : ''}
             ${zipCodeQuery ? ` · <strong>CEP:</strong> "${zipCodeQuery}"` : ''}
             ${neighborhoodQuery ? ` · <strong>Bairro:</strong> "${neighborhoodQuery}"` : ''}
             ${cityQuery ? ` · <strong>Cidade:</strong> "${cityQuery}"` : ''}
           </p>
           <table style="width:100%; border-collapse:collapse; font-size:11px;">
             <thead>
               <tr style="background:#f3f4f6;">${headerHtml || '<th style="padding:6px;border:1px solid #ddd;text-align:left;">—</th>'}</tr>
             </thead>
             <tbody>${rows || `<tr><td colspan="${colCount}" style="padding:12px;text-align:center;color:#888;">Nenhuma OS no filtro</td></tr>`}</tbody>
           </table>
           <p style="margin-top:16px; font-size:10px; color:#888;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
         </div>
       `;
   };

   const handlePreview = (propertyId?: string) => {
     setExportError(null);
     const targetPropertyId = propertyId || selectedPropertyId;
     const targetProperty = properties.find(p => p.id === targetPropertyId);
     if (!targetProperty) return;
     const htmlContent = generatePdfHtml(targetProperty);
     setPreviewHtml(htmlContent);
     setPreviewProperty(targetProperty);
     setShowPreview(true);
   };

    const exportHistoryPdf = async (shouldPrint: boolean = false) => {
      if (!previewProperty || !previewHtml) {
        setExportError("Dados do preview não encontrados.");
        return;
      }

      if (!previewHtml.includes('<tr>')) {
        setExportError("Não há dados para exportar com os filtros atuais.");
        return;
      }

      setExportError(null);
      setExporting(true);
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        const container = document.createElement('div');
        container.innerHTML = previewHtml;
        
        const pdfWorker = html2pdf().set({
          margin: parseInt(exportMargin),
          filename: `historico-${(previewProperty.address || 'imovel').replace(/[^\w]+/g, '_').slice(0, 40)}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        }).from(container);

        if (shouldPrint) {
          const pdf = await pdfWorker.outputPdf('blob');
          const url = URL.createObjectURL(pdf);
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = url;
          document.body.appendChild(iframe);
          iframe.contentWindow?.print();
          toast.success('Preparando impressão...');
        } else {
          await pdfWorker.save();
          toast.success('PDF gerado com sucesso');
          setShowPreview(false);
        }
      } catch (e: any) {
        console.error("Erro na exportação do PDF:", e);
        const detail = e?.message || "Ocorreu um erro inesperado ao gerar o arquivo.";
        setExportError(`Falha ao gerar PDF: ${detail}`);
        toast.error('Falha ao gerar PDF');
      } finally {
        setExporting(false);
      }
    };

  const totalPages = Math.max(1, Math.ceil(propertyOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = propertyOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset pagination when filters/search/property change
  useEffect(() => {
    setPage(1);
  }, [selectedPropertyId, statusFilter, periodFilter, dateField, orderQuery, requesterQuery, osNumberQuery, addressQuery, neighborhoodQuery, cityQuery, zipCodeQuery, sortKey]);

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
                      <Select value={sortKey} onValueChange={(v) => updateSort(v as SortKey)}>
                        <SelectTrigger className="h-9 w-[240px]" title="Ordenação da lista (também aplicada ao PDF)">
                          <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                            <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {periodFilter === 'custom' && (
                        <div className="flex items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9">
                                <CalendarRange className="h-4 w-4 mr-1" />
                                {customStart ? format(customStart, 'dd/MM/yyyy', { locale: ptBR }) : 'Início'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className={cn('p-3 pointer-events-auto')} locale={ptBR} />
                            </PopoverContent>
                          </Popover>
                          <span className="text-xs text-muted-foreground">até</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9">
                                <CalendarRange className="h-4 w-4 mr-1" />
                                {customEnd ? format(customEnd, 'dd/MM/yyyy', { locale: ptBR }) : 'Fim'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className={cn('p-3 pointer-events-auto')} locale={ptBR} />
                            </PopoverContent>
                          </Popover>
                          {(customStart || customEnd) && (
                            <Button variant="ghost" size="sm" onClick={() => { setCustomStart(undefined); setCustomEnd(undefined); }}>
                              ✕
                            </Button>
                          )}
                        </div>
                      )}
                      {filtersActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setStatusFilter('all'); setPeriodFilter('all'); setDateField('createdAt'); setCustomStart(undefined); setCustomEnd(undefined); }}
                        >
                          Limpar
                        </Button>
                      )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" title="Escolher colunas visíveis">
                            <Columns3 className="h-4 w-4 mr-1" /> Colunas
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-56">
                          <p className="text-xs font-semibold mb-2 text-muted-foreground">Colunas visíveis</p>
                          <div className="space-y-2">
                            {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map(k => (
                              <div key={k} className="flex items-center gap-2">
                                <Checkbox id={`col-${k}`} checked={columns[k]} onCheckedChange={(v) => toggleColumn(k, !!v)} />
                                <Label htmlFor={`col-${k}`} className="text-sm cursor-pointer">{COLUMN_LABELS[k]}</Label>
                              </div>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={resetColumnsToDefault}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar colunas padrão
                          </Button>
                          <p className="text-[10px] text-muted-foreground mt-2">Sua preferência é salva automaticamente.</p>
                        </PopoverContent>
                      </Popover>
                       <Select value={exportStatus} onValueChange={(v) => setExportStatus(v as OSStatus | 'all')}>
                         <SelectTrigger className="h-9 w-[160px]" title="Filtrar status no PDF">
                           <SelectValue placeholder="Status no PDF" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="all">PDF: todos status</SelectItem>
                           {(Object.keys(STATUS_LABELS) as OSStatus[]).map(s => (
                             <SelectItem key={s} value={s}>PDF: {STATUS_LABELS[s]}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                        <Select value={exportResponsible} onValueChange={setExportResponsible}>
                          <SelectTrigger className="h-9 w-[180px]" title="Filtrar responsável no PDF">
                            <SelectValue placeholder="Responsável no PDF" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">PDF: todos responsáveis</SelectItem>
                            {Array.from(new Set(propertyOrders.map(o => o.tecnico?.name).filter(Boolean))).map(name => (
                              <SelectItem key={name as string} value={name as string}>PDF: {name as string}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={exportScope} onValueChange={(v) => updateExportScope(v as 'page' | 'all')}>
                        <SelectTrigger className="h-9 w-[200px]" title="Escopo do PDF exportado">
                          <SelectValue placeholder="Escopo PDF" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">PDF: todos filtrados</SelectItem>
                          <SelectItem value="page">PDF: somente página atual</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                         onClick={() => exportHistoryPdf()}
                        disabled={exporting || propertyOrders.length === 0}
                        title="Exportar histórico filtrado em PDF"
                      >
                        {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                        Exportar PDF
                      </Button>
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
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 mb-2">
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
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Filtrar por nº da OS (ex: 1023)"
                          value={osNumberQuery}
                          onChange={(e) => setOsNumberQuery(e.target.value)}
                          inputMode="numeric"
                          className="pl-10 h-9"
                        />
                      </div>
                    </div>
                       <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4 mb-2">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Endereço/imóvel (texto livre)..."
                          value={addressQuery}
                          onChange={(e) => setAddressQuery(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="CEP..."
                            value={zipCodeQuery}
                            onChange={(e) => setZipCodeQuery(e.target.value)}
                            className="pl-10 h-9"
                          />
                        </div>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Bairro..."
                          value={neighborhoodQuery}
                          onChange={(e) => setNeighborhoodQuery(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cidade..."
                          value={cityQuery}
                          onChange={(e) => setCityQuery(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Button variant="outline" size="sm" onClick={saveAddressFilter} title="Salvar este filtro de endereço como padrão">
                        {hasSavedAddress ? <BookmarkCheck className="h-4 w-4 mr-1" /> : <Bookmark className="h-4 w-4 mr-1" />}
                        {hasSavedAddress ? 'Atualizar filtro de endereço' : 'Salvar filtro de endereço'}
                      </Button>
                      {(addressQuery || neighborhoodQuery || cityQuery || hasSavedAddress) && (
                        <Button variant="ghost" size="sm" onClick={clearAddressFilter} title="Limpar filtro de endereço (e remover padrão)">
                          Limpar endereço
                        </Button>
                      )}
                      {hasSavedAddress && (
                        <span className="text-[11px] text-muted-foreground">Restaurado automaticamente do seu padrão.</span>
                      )}
                    </div>
                    <div className="space-y-4">
                      {paginatedOrders.map((order) => {
                        const steps = buildOrderTimeline(order);
                        return (
                          <div key={order.id} className="border border-border rounded-lg p-4 bg-card">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                {columns.osNumber && <span className="font-semibold text-primary">{order.osNumber}</span>}
                                {columns.status && <StatusBadge status={order.status} />}
                                {columns.requester && order.requesterName && (
                                  <span className="text-xs text-muted-foreground">· {order.requesterName}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {columns.price && order.finalPrice && role !== 'tecnico' && (
                                  <span className="text-sm font-semibold text-foreground">R$ {order.finalPrice.toFixed(2)}</span>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/ordens/${order.id}`)}>
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Abrir OS</TooltipContent>
                                </Tooltip>
                                {order.status === 'concluido' && order.completionReport && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-status-completed"
                                        onClick={() => window.open(`/ordens/${order.id}/relatorio`, '_blank', 'noopener')}
                                      >
                                        <FileText className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Baixar relatório PDF</TooltipContent>
                                  </Tooltip>
                                )}
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button
                                       variant="ghost"
                                       size="icon"
                                       className="h-8 w-8"
                                       onClick={() => handlePreview(order.propertyId)}
                                       disabled={exporting}
                                     >
                                       <Download className="h-4 w-4 text-primary" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>Exportar PDF deste imóvel</TooltipContent>
                                 </Tooltip>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyOrderLink(order)}>
                                       <Link2 className="h-4 w-4" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>Copiar link / ID</TooltipContent>
                                 </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyPropertyLink(order)}>
                                      <Home className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar link do imóvel</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                            {columns.problem && <p className="text-sm text-foreground mb-4">{order.problem}</p>}

                            {columns.dates && (
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
                            )}
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
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview do PDF</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 border rounded-md bg-secondary/20 p-4">
            <div className="bg-white shadow-sm mx-auto min-h-full" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </ScrollArea>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 w-full sm:w-auto">
              {exportError && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded-md border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{exportError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" onClick={() => setShowPreview(false)} disabled={exporting}>
                Cancelar
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => exportHistoryPdf(true)} 
                  disabled={exporting}
                >
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                  Imprimir
                </Button>
                <Button 
                  onClick={() => exportHistoryPdf(false)} 
                  disabled={exporting}
                  variant={exportError ? "secondary" : "default"}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : exportError ? (
                    <RefreshCcw className="h-4 w-4 mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {exportError ? 'Tentar novamente' : 'Baixar PDF'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
    </DashboardLayout>
  );
};

export default HistoricoImoveis;
