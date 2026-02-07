import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileText, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Relatorios = () => {
  const [stats, setStats] = useState({
    total: 0,
    aguardandoOrcamento: 0,
    aguardandoAprovacao: 0,
    enviadoImobiliaria: 0,
    aprovadoAguardando: 0,
    emExecucao: 0,
    concluido: 0,
    faturamentoTotal: 0,
    custoTotal: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const { data: orders } = await supabase
        .from('service_orders')
        .select('status, final_price, technician_cost');

      if (orders) {
        setStats({
          total: orders.length,
          aguardandoOrcamento: orders.filter(o => o.status === 'aguardando_orcamento_prestador').length,
          aguardandoAprovacao: orders.filter(o => o.status === 'aguardando_aprovacao_admin').length,
          enviadoImobiliaria: orders.filter(o => o.status === 'enviado_imobiliaria').length,
          aprovadoAguardando: orders.filter(o => o.status === 'aprovado_aguardando').length,
          emExecucao: orders.filter(o => o.status === 'em_execucao').length,
          concluido: orders.filter(o => o.status === 'concluido').length,
          faturamentoTotal: orders.reduce((sum, o) => sum + (o.final_price || 0), 0),
          custoTotal: orders.reduce((sum, o) => sum + (o.technician_cost || 0), 0),
        });
      }
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.faturamentoTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo Técnico Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.custoTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Bruto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.faturamentoTotal - stats.custoTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="font-display text-xl font-semibold text-foreground mb-4">Ordens por Status</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de OS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.aguardandoOrcamento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Aprovação Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.aguardandoAprovacao}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enviado à Imobiliária</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.enviadoImobiliaria}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aprovado / Aguardando</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.aprovadoAguardando}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Execução</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.emExecucao}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluído</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.concluido}</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;
