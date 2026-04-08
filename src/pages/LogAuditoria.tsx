import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Search, User, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  assign_technician: { label: 'Designou Profissional', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  approve_budget: { label: 'Aprovou Orçamento', color: 'bg-green-500/10 text-green-700 border-green-200' },
  change_payment_method: { label: 'Alterou Pagamento', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  request_revision: { label: 'Solicitou Revisão', color: 'bg-orange-500/10 text-orange-700 border-orange-200' },
  client_approve: { label: 'Cliente Aprovou', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  start_execution: { label: 'Iniciou Execução', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-200' },
  complete_service: { label: 'Concluiu Serviço', color: 'bg-green-600/10 text-green-800 border-green-300' },
  delete_order: { label: 'Excluiu OS', color: 'bg-red-500/10 text-red-700 border-red-200' },
  submit_quote: { label: 'Enviou Orçamento', color: 'bg-purple-500/10 text-purple-700 border-purple-200' },
};

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
  profile?: { name: string; email: string } | null;
}

const LogAuditoria = () => {
  const [search, setSearch] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profile:profiles!audit_logs_user_id_fkey(name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        // If the join fails (no FK), fetch without it
        const { data: logsOnly, error: err2 } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        if (err2) throw err2;
        return (logsOnly || []) as AuditLog[];
      }

      return (data || []).map((d: any) => ({
        ...d,
        profile: Array.isArray(d.profile) ? d.profile[0] || null : d.profile,
      })) as AuditLog[];
    },
  });

  const filtered = logs.filter(log => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const actionLabel = ACTION_LABELS[log.action]?.label || log.action;
    const osNumber = log.details?.os_number || '';
    const userName = log.profile?.name || '';
    return (
      actionLabel.toLowerCase().includes(q) ||
      osNumber.toLowerCase().includes(q) ||
      userName.toLowerCase().includes(q) ||
      (log.ip_address || '').includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Log de Auditoria</h1>
              <p className="text-muted-foreground mt-1">Registro de todas as ações no sistema ({filtered.length})</p>
            </div>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ação, OS, usuário ou IP..."
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
          <div className="os-card text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum registro de auditoria encontrado</p>
          </div>
        ) : (
          <div className="os-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => {
                  const actionMeta = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{log.profile?.name || 'Desconhecido'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${actionMeta.color}`}>
                          {actionMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-primary">{log.details?.os_number || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {log.details?.final_price ? `R$ ${log.details.final_price.toFixed(2)}` : ''}
                          {log.details?.payment_method ? `Pagamento: ${log.details.payment_method}` : ''}
                          {log.details?.tecnico_id ? `Téc: ${log.details.tecnico_id.substring(0, 8)}...` : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">{log.ip_address || '-'}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LogAuditoria;
