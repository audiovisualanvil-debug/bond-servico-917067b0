import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';

export interface FinancialFilters {
  startDate: Date;
  endDate: Date;
}

export interface MonthlyData {
  month: string;
  faturamento: number;
  custo: number;
  lucro: number;
  quantidade: number;
}

export interface ImobiliariaBreakdown {
  id: string;
  name: string;
  company: string | null;
  totalOS: number;
  faturamento: number;
  custo: number;
  lucro: number;
  concluidas: number;
  pendentes: number;
}

export interface StatusCount {
  status: string;
  label: string;
  count: number;
  color: string;
}

export interface FinancialReport {
  faturamentoTotal: number;
  custoTotal: number;
  lucroTotal: number;
  totalOS: number;
  osConcluidas: number;
  ticketMedio: number;
  margemMedia: number;
  monthlyData: MonthlyData[];
  imobiliariaBreakdown: ImobiliariaBreakdown[];
  statusCounts: StatusCount[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aguardando_orcamento_prestador: { label: 'Aguardando Orçamento', color: 'hsl(45, 93%, 47%)' },
  aguardando_aprovacao_admin: { label: 'Aguardando Aprovação', color: 'hsl(20, 90%, 55%)' },
  enviado_imobiliaria: { label: 'Enviado Imobiliária', color: 'hsl(280, 65%, 55%)' },
  aprovado_aguardando: { label: 'Aprovado / Aguardando', color: 'hsl(217, 91%, 60%)' },
  em_execucao: { label: 'Em Execução', color: 'hsl(192, 70%, 35%)' },
  concluido: { label: 'Concluído', color: 'hsl(142, 76%, 36%)' },
};

export function useFinancialReport(filters: FinancialFilters) {
  return useQuery({
    queryKey: ['financial-report', filters.startDate.toISOString(), filters.endDate.toISOString()],
    queryFn: async (): Promise<FinancialReport> => {
      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id, status, final_price, technician_cost, created_at, completed_at,
          imobiliaria_id,
          imobiliaria:profiles!fk_so_imobiliaria_profile(id, name, company)
        `)
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      const rawOrders = orders || [];
      const typedOrders = rawOrders.map((o: any) => ({
        ...o,
        imobiliaria: Array.isArray(o.imobiliaria) ? o.imobiliaria[0] || null : o.imobiliaria,
      })) as Array<{
        id: string;
        status: string;
        final_price: number | null;
        technician_cost: number | null;
        created_at: string;
        completed_at: string | null;
        imobiliaria_id: string;
        imobiliaria: { id: string; name: string; company: string | null } | null;
      }>;

      // Totals
      const concluidas = typedOrders.filter(o => o.status === 'concluido');
      const faturamentoTotal = typedOrders.reduce((s, o) => s + (o.final_price || 0), 0);
      const custoTotal = typedOrders.reduce((s, o) => s + (o.technician_cost || 0), 0);
      const lucroTotal = faturamentoTotal - custoTotal;
      const ticketMedio = concluidas.length > 0
        ? concluidas.reduce((s, o) => s + (o.final_price || 0), 0) / concluidas.length
        : 0;
      const margemMedia = faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0;

      // Monthly aggregation
      const monthMap = new Map<string, MonthlyData>();
      for (const o of typedOrders) {
        const d = parseISO(o.created_at);
        const key = format(d, 'yyyy-MM');
        const label = format(d, 'MMM/yy');
        if (!monthMap.has(key)) {
          monthMap.set(key, { month: label, faturamento: 0, custo: 0, lucro: 0, quantidade: 0 });
        }
        const entry = monthMap.get(key)!;
        entry.faturamento += o.final_price || 0;
        entry.custo += o.technician_cost || 0;
        entry.lucro = entry.faturamento - entry.custo;
        entry.quantidade += 1;
      }
      const monthlyData = Array.from(monthMap.values());

      // Imobiliária breakdown
      const imobMap = new Map<string, ImobiliariaBreakdown>();
      for (const o of typedOrders) {
        const id = o.imobiliaria_id;
        if (!imobMap.has(id)) {
          imobMap.set(id, {
            id,
            name: o.imobiliaria?.name || 'Desconhecido',
            company: o.imobiliaria?.company || null,
            totalOS: 0,
            faturamento: 0,
            custo: 0,
            lucro: 0,
            concluidas: 0,
            pendentes: 0,
          });
        }
        const entry = imobMap.get(id)!;
        entry.totalOS += 1;
        entry.faturamento += o.final_price || 0;
        entry.custo += o.technician_cost || 0;
        entry.lucro = entry.faturamento - entry.custo;
        if (o.status === 'concluido') entry.concluidas += 1;
        else entry.pendentes += 1;
      }
      const imobiliariaBreakdown = Array.from(imobMap.values())
        .sort((a, b) => b.faturamento - a.faturamento);

      // Status counts
      const statusMap = new Map<string, number>();
      for (const o of typedOrders) {
        statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
      }
      const statusCounts: StatusCount[] = Object.entries(STATUS_LABELS).map(([status, meta]) => ({
        status,
        label: meta.label,
        count: statusMap.get(status) || 0,
        color: meta.color,
      }));

      return {
        faturamentoTotal,
        custoTotal,
        lucroTotal,
        totalOS: typedOrders.length,
        osConcluidas: concluidas.length,
        ticketMedio,
        margemMedia,
        monthlyData,
        imobiliariaBreakdown,
        statusCounts,
      };
    },
  });
}

export function getDefaultFilters(): FinancialFilters {
  const now = new Date();
  return {
    startDate: startOfMonth(subMonths(now, 5)),
    endDate: endOfMonth(now),
  };
}
