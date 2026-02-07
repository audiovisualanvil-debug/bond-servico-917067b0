import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader2, DollarSign, TrendingUp, Receipt, BarChart3, Percent, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFinancialReport, getDefaultFilters } from '@/hooks/useFinancialReport';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: Date) => d.toISOString().split('T')[0];

const Relatorios = () => {
  const [filters, setFilters] = useState(getDefaultFilters);

  const { data: report, isLoading } = useFinancialReport(filters);

  if (isLoading || !report) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const kpiCards = [
    { title: 'Faturamento Total', value: formatCurrency(report.faturamentoTotal), icon: DollarSign, variant: 'primary' as const },
    { title: 'Custo Técnico', value: formatCurrency(report.custoTotal), icon: Receipt, variant: 'default' as const },
    { title: 'Lucro Bruto', value: formatCurrency(report.lucroTotal), icon: TrendingUp, variant: 'accent' as const },
    { title: 'Total de OS', value: report.totalOS, icon: BarChart3, variant: 'default' as const },
    { title: 'Ticket Médio', value: formatCurrency(report.ticketMedio), icon: DollarSign, variant: 'default' as const },
    { title: 'Margem Média', value: `${report.margemMedia.toFixed(1)}%`, icon: Percent, variant: 'default' as const },
  ];

  const variantStyles: Record<string, string> = {
    default: 'bg-card border-border',
    primary: 'bg-gradient-primary border-primary/20 text-primary-foreground',
    accent: 'bg-gradient-accent border-accent/20 text-accent-foreground',
  };

  const iconBgStyles: Record<string, string> = {
    default: 'bg-primary/10 text-primary',
    primary: 'bg-primary-foreground/20 text-primary-foreground',
    accent: 'bg-accent-foreground/20 text-accent-foreground',
  };

  return (
    <DashboardLayout>
      {/* Header + Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Relatórios Financeiros</h1>
          <p className="text-muted-foreground mt-1">Análise completa de faturamento, custos e desempenho</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <Input
              type="date"
              value={formatDate(filters.startDate)}
              onChange={e => setFilters(f => ({ ...f, startDate: new Date(e.target.value + 'T00:00:00') }))}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <Input
              type="date"
              value={formatDate(filters.endDate)}
              onChange={e => setFilters(f => ({ ...f, endDate: new Date(e.target.value + 'T23:59:59') }))}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8 stagger-children">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className={`stat-card border ${variantStyles[kpi.variant]}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className={`text-xs font-medium truncate ${kpi.variant === 'default' ? 'text-muted-foreground' : 'opacity-80'}`}>
                    {kpi.title}
                  </p>
                  <p className="mt-1 text-xl font-bold font-display truncate">{kpi.value}</p>
                </div>
                <div className={`rounded-lg p-2 shrink-0 ${iconBgStyles[kpi.variant]}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Bar Chart - Monthly Revenue */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Faturamento x Custo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {report.monthlyData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado no período selecionado</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={report.monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(215, 15%, 50%)' }} />
                  <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'hsl(215, 15%, 50%)' }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(0, 0%, 100%)',
                      border: '1px solid hsl(220, 15%, 90%)',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="faturamento" name="Faturamento" fill="hsl(192, 70%, 35%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custo" name="Custo" fill="hsl(20, 90%, 55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lucro" name="Lucro" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">OS por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {report.totalOS === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={report.statusCounts.filter(s => s.count > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="label"
                    >
                      {report.statusCounts.filter(s => s.count > 0).map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(220, 15%, 90%)',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {report.statusCounts.filter(s => s.count > 0).map(s => (
                    <div key={s.status} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-xs text-muted-foreground truncate">{s.label}</span>
                      <span className="text-xs font-semibold text-foreground ml-auto">{s.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Imobiliária Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Desempenho por Imobiliária</CardTitle>
        </CardHeader>
        <CardContent>
          {report.imobiliariaBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma imobiliária no período</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imobiliária</TableHead>
                    <TableHead className="text-center">OS</TableHead>
                    <TableHead className="text-center">Concluídas</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.imobiliariaBreakdown.map(row => {
                    const margem = row.faturamento > 0
                      ? ((row.lucro / row.faturamento) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{row.name}</p>
                            {row.company && (
                              <p className="text-xs text-muted-foreground">{row.company}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{row.totalOS}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-status-completed" />
                            {row.concluidas}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.faturamento)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(row.custo)}</TableCell>
                        <TableCell className="text-right font-semibold text-status-completed">{formatCurrency(row.lucro)}</TableCell>
                        <TableCell className="text-right">{margem}%</TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">{report.totalOS}</TableCell>
                    <TableCell className="text-center">{report.osConcluidas}</TableCell>
                    <TableCell className="text-right">{formatCurrency(report.faturamentoTotal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(report.custoTotal)}</TableCell>
                    <TableCell className="text-right text-status-completed">{formatCurrency(report.lucroTotal)}</TableCell>
                    <TableCell className="text-right">{report.margemMedia.toFixed(1)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Relatorios;
