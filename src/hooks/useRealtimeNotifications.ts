import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  aguardando_orcamento_prestador: 'Aguardando Orçamento',
  aguardando_aprovacao_admin: 'Aguardando Aprovação Admin',
  enviado_imobiliaria: 'Enviado à Imobiliária',
  aprovado_aguardando: 'Aprovado - Aguardando Execução',
  em_execucao: 'Em Execução',
  concluido: 'Concluído',
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'aguardando_orcamento_prestador': return '📋';
    case 'aguardando_aprovacao_admin': return '⏳';
    case 'enviado_imobiliaria': return '📨';
    case 'aprovado_aguardando': return '✅';
    case 'em_execucao': return '🔧';
    case 'concluido': return '🎉';
    default: return '🔔';
  }
}

export function useRealtimeNotifications() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!user || !role || subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel('os-realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_orders' },
        (payload) => {
          const newRow = payload.new as Record<string, any>;
          const oldRow = payload.old as Record<string, any>;

          // Only notify on status changes
          if (!oldRow.status || newRow.status === oldRow.status) {
            // Still invalidate queries for other updates
            queryClient.invalidateQueries({ queryKey: ['service-orders'] });
            queryClient.invalidateQueries({ queryKey: ['service-order', newRow.id] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            return;
          }

          // Check if this notification is relevant to the current user
          const isRelevant =
            role === 'admin' ||
            (role === 'tecnico' && newRow.tecnico_id === user.id) ||
            ((role === 'imobiliaria' || role === 'pessoa_fisica') && newRow.imobiliaria_id === user.id);

          if (!isRelevant) return;

          const osNumber = newRow.os_number || 'OS';
          const icon = getStatusIcon(newRow.status);
          const label = getStatusLabel(newRow.status);

          toast.info(`${icon} ${osNumber} — ${label}`, {
            description: getNotificationMessage(newRow.status, role),
            duration: 6000,
          });

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['service-orders'] });
          queryClient.invalidateQueries({ queryKey: ['service-order', newRow.id] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'service_orders' },
        (payload) => {
          const newRow = payload.new as Record<string, any>;

          if (role === 'admin') {
            toast.info(`📋 Nova OS criada — ${newRow.os_number || 'OS'}`, {
              description: 'Uma nova ordem de serviço foi registrada.',
              duration: 5000,
            });
          } else if (role === 'tecnico' && newRow.tecnico_id === user.id) {
            toast.info(`📋 Nova OS atribuída — ${newRow.os_number || 'OS'}`, {
              description: 'Você recebeu uma nova ordem de serviço.',
              duration: 5000,
            });
          }

          queryClient.invalidateQueries({ queryKey: ['service-orders'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'service_orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['service-orders'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe();

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user, role, queryClient]);
}

function getNotificationMessage(status: string, role: string): string {
  switch (status) {
    case 'aguardando_orcamento_prestador':
      return role === 'tecnico'
        ? 'Você recebeu uma nova OS. Envie seu orçamento.'
        : 'OS aguardando orçamento do profissional.';
    case 'aguardando_aprovacao_admin':
      return role === 'admin'
        ? 'Orçamento recebido. Revise e aprove.'
        : 'Orçamento enviado para aprovação.';
    case 'enviado_imobiliaria':
      return (role === 'imobiliaria' || role === 'pessoa_fisica')
        ? 'Um orçamento foi enviado para sua aprovação.'
        : 'Orçamento enviado para o solicitante.';
    case 'aprovado_aguardando':
      return role === 'tecnico'
        ? 'Orçamento aprovado! Inicie a execução.'
        : 'Orçamento aprovado pelo solicitante.';
    case 'em_execucao':
      return 'O serviço está em execução.';
    case 'concluido':
      return (role === 'imobiliaria' || role === 'pessoa_fisica')
        ? 'O serviço foi concluído. Confira o relatório.'
        : 'Serviço concluído com sucesso!';
    default:
      return 'Status da OS foi atualizado.';
  }
}
