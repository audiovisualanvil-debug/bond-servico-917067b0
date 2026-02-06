import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useParams, useNavigate } from 'react-router-dom';
import { mockServiceOrders } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { UrgencyIndicator } from '@/components/UrgencyIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Building2,
  Wrench,
  DollarSign,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  Camera,
} from 'lucide-react';

const OSDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();

  const order = mockServiceOrders.find(os => os.id === id);

  // Technician quote form
  const [techQuote, setTechQuote] = useState({
    description: order?.technicianDescription || '',
    cost: order?.technicianCost || 0,
    deadline: order?.estimatedDeadline || 1,
  });

  // Admin pricing form
  const [finalPrice, setFinalPrice] = useState(order?.finalPrice || 0);

  // Completion report form
  const [report, setReport] = useState({
    description: '',
    observations: '',
    checklist: [
      { id: '1', item: 'Problema identificado', completed: false },
      { id: '2', item: 'Serviço executado', completed: false },
      { id: '3', item: 'Área limpa', completed: false },
      { id: '4', item: 'Cliente informado', completed: false },
    ],
  });

  if (!order) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ordem de serviço não encontrada</p>
          <Button className="mt-4" onClick={() => navigate('/ordens')}>
            Voltar para lista
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleTechnicianSubmit = () => {
    toast.success('Orçamento enviado!', {
      description: 'Aguardando aprovação do administrador.',
    });
  };

  const handleAdminApprove = () => {
    toast.success('Orçamento aprovado e enviado!', {
      description: 'E-mail enviado para a imobiliária.',
    });
  };

  const handleClientApprove = () => {
    toast.success('Serviço aprovado!', {
      description: 'O técnico foi notificado para iniciar a execução.',
    });
  };

  const handleCompleteService = () => {
    toast.success('Serviço finalizado!', {
      description: 'Relatório gerado e enviado para a imobiliária.',
    });
  };

  const renderActionSection = () => {
    switch (role) {
      case 'tecnico':
        if (order.status === 'aguardando_orcamento') {
          return (
            <div className="os-card">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Enviar Orçamento</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Descrição do serviço necessário</Label>
                  <Textarea
                    placeholder="Descreva o que precisa ser feito..."
                    value={techQuote.description}
                    onChange={(e) => setTechQuote(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Valor do Custo (R$)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={techQuote.cost || ''}
                      onChange={(e) => setTechQuote(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label>Prazo (dias)</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={techQuote.deadline}
                      onChange={(e) => setTechQuote(prev => ({ ...prev, deadline: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>
                <Button onClick={handleTechnicianSubmit} className="w-full">
                  <Send className="h-4 w-4" />
                  Enviar Orçamento
                </Button>
              </div>
            </div>
          );
        }

        if (order.status === 'aprovado_aguardando' || order.status === 'em_execucao') {
          return (
            <div className="os-card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Relatório de Execução</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>O que foi feito</Label>
                  <Textarea
                    placeholder="Descreva detalhadamente o que foi executado..."
                    value={report.description}
                    onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Checklist</Label>
                  <div className="space-y-2">
                    {report.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          id={item.id}
                          checked={item.completed}
                          onCheckedChange={(checked) => {
                            setReport(prev => ({
                              ...prev,
                              checklist: prev.checklist.map(i =>
                                i.id === item.id ? { ...i, completed: !!checked } : i
                              ),
                            }));
                          }}
                        />
                        <label htmlFor={item.id} className="text-sm">{item.item}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block">Fotos Antes</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <Camera className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Adicionar fotos</p>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Fotos Depois</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <Camera className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Adicionar fotos</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações adicionais..."
                    value={report.observations}
                    onChange={(e) => setReport(prev => ({ ...prev, observations: e.target.value }))}
                    rows={2}
                  />
                </div>

                <Button onClick={handleCompleteService} variant="success" className="w-full">
                  <CheckCircle2 className="h-4 w-4" />
                  Finalizar Serviço
                </Button>
              </div>
            </div>
          );
        }
        break;

      case 'admin':
        if (order.status === 'aguardando_aprovacao_admin') {
          return (
            <div className="os-card border-2 border-accent/30">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-accent" />
                <h2 className="font-display font-semibold text-lg">Definir Valor Final</h2>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Custo do técnico</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {order.technicianCost?.toFixed(2)}
                  </p>
                </div>

                <div>
                  <Label className="text-base font-semibold">Valor Final para o Cliente (R$)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Digite o valor que deseja cobrar da imobiliária
                  </p>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={finalPrice || ''}
                    onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)}
                    className="text-xl font-bold"
                  />
                  {finalPrice > 0 && order.technicianCost && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Margem: <strong className="text-status-approved">
                        R$ {(finalPrice - order.technicianCost).toFixed(2)}
                      </strong> ({((finalPrice - order.technicianCost) / order.technicianCost * 100).toFixed(0)}%)
                    </p>
                  )}
                </div>

                <Button onClick={handleAdminApprove} variant="accent" className="w-full" size="lg">
                  <Send className="h-4 w-4" />
                  Aprovar e Enviar Orçamento
                </Button>
              </div>
            </div>
          );
        }
        break;

      case 'imobiliaria':
        if (order.status === 'enviado_imobiliaria') {
          return (
            <div className="os-card border-2 border-primary/30">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Orçamento Recebido</h2>
              </div>
              <div className="space-y-4">
                <div className="p-6 bg-primary/5 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Valor do Serviço</p>
                  <p className="text-4xl font-bold text-primary mt-1">
                    R$ {order.finalPrice?.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Prazo: {order.estimatedDeadline} {order.estimatedDeadline === 1 ? 'dia' : 'dias'}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1">
                    Solicitar Revisão
                  </Button>
                  <Button onClick={handleClientApprove} variant="success" className="flex-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Aprovar Serviço
                  </Button>
                </div>
              </div>
            </div>
          );
        }
        break;
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-3xl font-bold text-foreground">
                  {order.osNumber}
                </h1>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-muted-foreground">
                Aberto em {format(order.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <UrgencyIndicator urgency={order.urgency} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem */}
            <div className="os-card">
              <h2 className="font-display font-semibold text-lg mb-3">Problema Reportado</h2>
              <p className="text-foreground">{order.problem}</p>
            </div>

            {/* Technician Quote (if available) */}
            {order.technicianDescription && (
              <div className="os-card">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">Diagnóstico do Técnico</h2>
                </div>
                <p className="text-foreground mb-4">{order.technicianDescription}</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Custo: R$ {order.technicianCost?.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Prazo: {order.estimatedDeadline} {order.estimatedDeadline === 1 ? 'dia' : 'dias'}
                  </div>
                </div>
              </div>
            )}

            {/* Completion Report (if available) */}
            {order.completionReport && (
              <div className="os-card border-2 border-status-completed/30">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-status-completed" />
                  <h2 className="font-display font-semibold text-lg">Relatório de Conclusão</h2>
                </div>
                <p className="text-foreground mb-4">{order.completionReport.description}</p>
                
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Checklist:</p>
                  <div className="space-y-1">
                    {order.completionReport.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className={`h-4 w-4 ${item.completed ? 'text-status-completed' : 'text-muted-foreground'}`} />
                        <span className={item.completed ? '' : 'text-muted-foreground line-through'}>{item.item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {order.completionReport.observations && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Observações:</p>
                    <p className="text-sm text-muted-foreground">{order.completionReport.observations}</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                  <span>Técnico: {order.completionReport.technicianSignature}</span>
                  <span>{format(order.completionReport.completedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              </div>
            )}

            {/* Action Section */}
            {renderActionSection()}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Property Info */}
            <div className="os-card">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Imóvel</h3>
              </div>
              <p className="text-sm text-foreground">{order.property.address}</p>
              <p className="text-sm text-muted-foreground">
                {order.property.neighborhood}, {order.property.city}
              </p>
              <Button variant="link" className="p-0 h-auto mt-2 text-sm">
                Ver histórico do imóvel →
              </Button>
            </div>

            {/* Imobiliaria Info */}
            <div className="os-card">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Imobiliária</h3>
              </div>
              <p className="text-sm text-foreground">{order.imobiliaria.company}</p>
              <p className="text-sm text-muted-foreground">{order.imobiliaria.name}</p>
            </div>

            {/* Requester */}
            <div className="os-card">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Solicitante</h3>
              </div>
              <p className="text-sm text-foreground">{order.requesterName}</p>
            </div>

            {/* Technician (if assigned) */}
            {order.tecnico && (
              <div className="os-card">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Técnico Responsável</h3>
                </div>
                <p className="text-sm text-foreground">{order.tecnico.name}</p>
                <p className="text-sm text-muted-foreground">{order.tecnico.phone}</p>
              </div>
            )}

            {/* Timeline */}
            <div className="os-card">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Histórico</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div>
                    <p className="font-medium">Chamado aberto</p>
                    <p className="text-muted-foreground">
                      {format(order.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {order.quoteSentAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-status-pending mt-1.5" />
                    <div>
                      <p className="font-medium">Orçamento enviado</p>
                      <p className="text-muted-foreground">
                        {format(order.quoteSentAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
                {order.adminApprovedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-status-waiting mt-1.5" />
                    <div>
                      <p className="font-medium">Aprovado pelo admin</p>
                      <p className="text-muted-foreground">
                        {format(order.adminApprovedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
                {order.clientApprovedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-status-approved mt-1.5" />
                    <div>
                      <p className="font-medium">Aprovado pelo cliente</p>
                      <p className="text-muted-foreground">
                        {format(order.clientApprovedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-status-completed mt-1.5" />
                    <div>
                      <p className="font-medium">Serviço concluído</p>
                      <p className="text-muted-foreground">
                        {format(order.completedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OSDetail;
