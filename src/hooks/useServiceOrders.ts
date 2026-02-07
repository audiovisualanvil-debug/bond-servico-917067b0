import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { typedFrom } from '@/integrations/supabase/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { ServiceOrder, Property, User, CompletionReport, DashboardStats } from '@/types/serviceOrder';
import { OsStatus } from '@/types/database';

// ---------- MAPPERS ----------

interface DbProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
}

interface DbProperty {
  id: string;
  imobiliaria_id: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string | null;
  code: string | null;
  tenant_name: string | null;
  owner_name: string | null;
}

interface DbServiceOrder {
  id: string;
  os_number: string;
  property_id: string;
  imobiliaria_id: string;
  tecnico_id: string | null;
  problem: string;
  photos: string[];
  urgency: string;
  requester_name: string;
  technician_description: string | null;
  technician_cost: number | null;
  estimated_deadline: number | null;
  quote_sent_at: string | null;
  final_price: number | null;
  admin_approved_at: string | null;
  client_approved_at: string | null;
  execution_started_at: string | null;
  completed_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  property?: DbProperty;
  imobiliaria?: DbProfile;
  tecnico?: DbProfile | null;
  completion_report?: DbCompletionReport[];
}

interface DbCompletionReport {
  id: string;
  service_order_id: string;
  description: string;
  checklist: any;
  photos_before: string[];
  photos_after: string[];
  observations: string | null;
  technician_signature: string;
  completed_at: string;
}

function mapProfile(p: DbProfile | null | undefined): User | undefined {
  if (!p) return undefined;
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: 'imobiliaria', // role is determined by user_roles table, not stored here
    company: p.company || undefined,
    phone: p.phone || undefined,
    avatar: p.avatar_url || undefined,
  };
}

function mapProperty(p: DbProperty | null | undefined): Property {
  return {
    id: p?.id || '',
    address: p?.address || '',
    neighborhood: p?.neighborhood || '',
    city: p?.city || '',
    state: p?.state || '',
    zipCode: p?.zip_code || '',
    imobiliariaId: p?.imobiliaria_id || '',
    code: p?.code || undefined,
    tenantName: p?.tenant_name || undefined,
    ownerName: p?.owner_name || undefined,
  };
}

function mapCompletionReport(r: DbCompletionReport | null | undefined): CompletionReport | undefined {
  if (!r) return undefined;
  return {
    description: r.description,
    checklist: Array.isArray(r.checklist) ? r.checklist : [],
    photosBefore: r.photos_before || [],
    photosAfter: r.photos_after || [],
    observations: r.observations || undefined,
    technicianSignature: r.technician_signature,
    completedAt: new Date(r.completed_at),
  };
}

function mapServiceOrder(db: DbServiceOrder): ServiceOrder {
  const reports = db.completion_report;
  const report = Array.isArray(reports) && reports.length > 0 ? reports[0] : null;

  return {
    id: db.id,
    osNumber: db.os_number,
    propertyId: db.property_id,
    property: mapProperty(db.property),
    imobiliariaId: db.imobiliaria_id,
    imobiliaria: mapProfile(db.imobiliaria) || { id: db.imobiliaria_id, name: '', email: '', role: 'imobiliaria' },
    tecnicoId: db.tecnico_id || undefined,
    tecnico: mapProfile(db.tecnico),
    problem: db.problem,
    photos: db.photos || [],
    urgency: db.urgency as any,
    requesterName: db.requester_name,
    createdAt: new Date(db.created_at),
    technicianDescription: db.technician_description || undefined,
    technicianCost: db.technician_cost || undefined,
    estimatedDeadline: db.estimated_deadline || undefined,
    quoteSentAt: db.quote_sent_at ? new Date(db.quote_sent_at) : undefined,
    finalPrice: db.final_price || undefined,
    adminApprovedAt: db.admin_approved_at ? new Date(db.admin_approved_at) : undefined,
    clientApprovedAt: db.client_approved_at ? new Date(db.client_approved_at) : undefined,
    executionStartedAt: db.execution_started_at ? new Date(db.execution_started_at) : undefined,
    completedAt: db.completed_at ? new Date(db.completed_at) : undefined,
    completionReport: mapCompletionReport(report),
    status: db.status as any,
  };
}

// ---------- SELECT QUERY ----------

const SERVICE_ORDER_SELECT = `
  *,
  property:properties!service_orders_property_id_fkey(*),
  imobiliaria:profiles!fk_so_imobiliaria_profile(*),
  tecnico:profiles!fk_so_tecnico_profile(*),
  completion_report:completion_reports(*)
`;

// ---------- HOOKS ----------

export function useServiceOrders(statusFilter?: string) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['service-orders', user?.id, role, statusFilter],
    queryFn: async () => {
      if (!user || !role) return [];

      let query = typedFrom('service_orders').select(SERVICE_ORDER_SELECT);

      // Role-based filtering
      if (role === 'imobiliaria') {
        query = query.eq('imobiliaria_id', user.id);
      } else if (role === 'tecnico') {
        query = query.eq('tecnico_id', user.id);
      }
      // Admin sees all

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data as DbServiceOrder[]).map(mapServiceOrder);
    },
    enabled: !!user && !!role,
  });
}

export function useServiceOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['service-order', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await typedFrom('service_orders')
        .select(SERVICE_ORDER_SELECT)
        .eq('id', id)
        .single();

      if (error) throw error;
      return mapServiceOrder(data as DbServiceOrder);
    },
    enabled: !!id,
  });
}

export function useDashboardStats() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id, role],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user || !role) return { total: 0, pending: 0, inProgress: 0, completed: 0, thisMonth: 0 };

      let query = typedFrom('service_orders').select('status, final_price, created_at');

      if (role === 'imobiliaria') {
        query = query.eq('imobiliaria_id', user.id);
      } else if (role === 'tecnico') {
        query = query.eq('tecnico_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders = data as { status: string; final_price: number | null; created_at: string }[];
      const now = new Date();
      const thisMonth = orders.filter(o => {
        const d = new Date(o.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const pendingStatuses = ['aguardando_orcamento_prestador', 'aguardando_aprovacao_admin', 'enviado_imobiliaria'];
      const inProgressStatuses = ['aprovado_aguardando', 'em_execucao'];
      const completedOrders = orders.filter(o => o.status === 'concluido');

      return {
        total: orders.length,
        pending: role === 'admin'
          ? orders.filter(o => o.status === 'aguardando_aprovacao_admin').length
          : role === 'tecnico'
            ? orders.filter(o => o.status === 'aguardando_orcamento_prestador').length
            : orders.filter(o => pendingStatuses.includes(o.status)).length,
        inProgress: orders.filter(o => inProgressStatuses.includes(o.status)).length,
        completed: completedOrders.length,
        thisMonth: thisMonth.length,
        revenue: role === 'admin' ? completedOrders.reduce((sum, o) => sum + (o.final_price || 0), 0) : undefined,
      };
    },
    enabled: !!user && !!role,
  });
}

// ---------- MUTATIONS ----------

export function useCreateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      property_id: string;
      imobiliaria_id: string;
      problem: string;
      urgency: string;
      requester_name: string;
      photos?: string[];
    }) => {
      const { data: result, error } = await typedFrom('service_orders')
        .insert({
          ...data,
          os_number: 'TEMP', // Will be overwritten by trigger
          photos: data.photos || [],
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await typedFrom('service_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['service-order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useCreateCompletionReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      service_order_id: string;
      description: string;
      checklist: any[];
      photos_before?: string[];
      photos_after?: string[];
      observations?: string;
      technician_signature: string;
    }) => {
      const { data: result, error } = await typedFrom('completion_reports')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['service-order'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

// ---------- REALTIME ----------

export function useServiceOrdersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('service-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['service-orders'] });
          queryClient.invalidateQueries({ queryKey: ['service-order'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
