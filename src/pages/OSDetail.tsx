import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatPhone } from '@/components/ui/phone-input';
import { ServiceOrderComments } from '@/components/ServiceOrderComments';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { UrgencyIndicator } from '@/components/UrgencyIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompletionReportForm } from '@/components/CompletionReportForm';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, MapPin, Calendar, User, Building2, Wrench,
  DollarSign, Send, CheckCircle2, Clock, FileText, Loader2, ExternalLink, UserPlus, Phone, FileDown, Trash2, Mail,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useServiceOrder, useUpdateServiceOrder, useCreateCompletionReport, useDeleteServiceOrder } from '@/hooks/useServiceOrders';
import { useTechnicians } from '@/hooks/useTechnicians';

const OSDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();

  const { data: order, isLoading, error } = useServiceOrder(id);
  const updateOrder = useUpdateServiceOrder();
  const createReport = useCreateCompletionReport();
  const deleteOrder = useDeleteServiceOrder();
  const { data: technicians = [] } = useTechnicians();

  // Admin technician assignment
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [sendingReportTo, setSendingReportTo] = useState<string | null>(null);

  // Technician quote form (itemized)
  const [techQuote, setTechQuote] = useState({
    description: '',
    laborCost: 0,
    materialCost: 0,
    taxCost: 0,
    deadline: 1,
  });

  // Admin pricing form
  const [finalPrice, setFinalPrice] = useState(0);

  // Initialize forms when order loads
  if (order && techQuote.description === '' && order.technicianDescription) {
    setTechQuote({
      description: order.technicianDescription,
      laborCost: order.laborCost || 0,
      materialCost: order.materialCost || 0,
      taxCost: order.taxCost || 0,
      deadline: order.estimatedDeadline || 1,
    });
  }
  if (order && finalPrice === 0 && order.finalPrice) {
    setFinalPrice(order.finalPrice);
  } else if (order && finalPrice === 0 && !order.finalPrice && order.technicianCost) {
    // Pre-fill with technician cost + 40%
    setFinalPrice(Math.round(order.technicianCost * 1.4 * 100) / 100);
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !order) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {error ? 'Erro ao carregar ordem de serviço' : 'Ordem de serviço não encontrada'}
          </p>
          <Button className="mt-4" onClick={() => navigate('/ordens')}>
            Voltar para lista
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleTechnicianSubmit = async () => {
    if (!techQuote.description.trim()) {
      toast.error('Preencha a descrição do serviço');
      return;
    }
    const totalCost = techQuote.laborCost + techQuote.materialCost + techQuote.taxCost;
    if (totalCost <= 0) {
      toast.error('Informe ao menos um valor de custo (mão de obra, materiais ou impostos)');
      return;
    }
    try {
      await updateOrder.mutateAsync({
        id: order.id,
        technician_description: techQuote.description.trim(),
        labor_cost: techQuote.laborCost,
        material_cost: techQuote.materialCost,
        tax_cost: techQuote.taxCost,
        technician_cost: totalCost,
        estimated_deadline: techQuote.deadline,
        status: 'aguardando_aprovacao_admin',
      });
      // Fire-and-forget notification
      supabase.functions.invoke('notify-status-change', {
        body: { serviceOrderId: order.id, newStatus: 'aguardando_aprovacao_admin' },
      }).catch(e => console.error('Notification error:', e));
      toast.success('Orçamento enviado!', { description: 'Aguardando aprovação do administrador.' });
    } catch (error: any) {
      toast.error('Erro ao enviar orçamento', { description: error.message });
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedTechnicianId) {
      toast.error('Selecione um técnico');
      return;
    }
    try {
      await updateOrder.mutateAsync({
        id: order.id,
        tecnico_id: selectedTechnicianId,
      });
      // Notify assigned technician
      supabase.functions.invoke('notify-status-change', {
        body: { serviceOrderId: order.id, newStatus: 'aguardando_orcamento_prestador' },
      }).catch(e => console.error('Notification error:', e));
      toast.success('Técnico designado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao designar técnico', { description: error.message });
    }
  };

  const handleAdminApprove = async () => {
    try {
      const paymentValue = (order as any).paymentMethod || undefined;
      await updateOrder.mutateAsync({
        id: order.id,
        final_price: finalPrice,
        payment_method: paymentValue,
        status: 'enviado_imobiliaria',
      });

      // Send budget approved email (fire-and-forget)
      supabase.functions.invoke('send-budget-approved', {
        body: { serviceOrderId: order.id },
      }).then(({ data, error }) => {
        if (error) console.error('Budget email error:', error);
        else console.log('Budget email result:', data);
      });

      toast.success('Orçamento aprovado e enviado!', { description: 'E-mail enviado para a imobiliária.' });
    } catch (error: any) {
      toast.error('Erro ao aprovar orçamento', { description: error.message });
    }
  };

  const handleRequestRevision = async () => {
    try {
      await updateOrder.mutateAsync({
        id: order.id,
        status: 'aguardando_aprovacao_admin',
      });
      toast.success('Revisão solicitada!', { description: 'O administrador será notificado para revisar o orçamento.' });
    } catch (error: any) {
      toast.error('Erro ao solicitar revisão', { description: error.message });
    }
  };

  const handleClientApprove = async () => {
    try {
      await updateOrder.mutateAsync({
        id: order.id,
        status: 'aprovado_aguardando',
      });
      toast.success('Serviço aprovado!', { description: 'O técnico foi notificado para iniciar a execução.' });
    } catch (error: any) {
      toast.error('Erro ao aprovar serviço', { description: error.message });
    }
  };

  const handleStartExecution = async () => {
    try {
      await updateOrder.mutateAsync({
        id: order.id,
        status: 'em_execucao',
      });
      toast.success('Execução iniciada!');
    } catch (error: any) {
      toast.error('Erro ao iniciar execução', { description: error.message });
    }
  };

  const handleCompleteService = async (reportData: {
    description: string;
    observations: string;
    checklist: any[];
    photosBefore: string[];
    photosAfter: string[];
    technicianSignature: string;
  }) => {
    try {
      await createReport.mutateAsync({
        service_order_id: order.id,
        description: reportData.description,
        checklist: reportData.checklist,
        photos_before: reportData.photosBefore,
        photos_after: reportData.photosAfter,
        observations: reportData.observations || undefined,
        technician_signature: reportData.technicianSignature,
      });
      await updateOrder.mutateAsync({
        id: order.id,
        status: 'concluido',
      });

      // Send completion report email (fire-and-forget)
      const reportUrl = `${window.location.origin}/ordens/${order.id}/relatorio`;
      supabase.functions.invoke('send-completion-report', {
        body: { serviceOrderId: order.id, reportUrl },
      }).catch(e => console.error('Email send error:', e));

      // Notify imobiliaria of completion
      supabase.functions.invoke('notify-status-change', {
        body: { serviceOrderId: order.id, newStatus: 'concluido' },
      }).catch(e => console.error('Notification error:', e));

      toast.success('Serviço finalizado!', { description: 'Relatório gerado e e-mail enviado para a imobiliária.' });
    } catch (error: any) {
      toast.error('Erro ao finalizar serviço', { description: error.message });
    }
  };
  const handleDeleteOrder = async () => {
    try {
      await deleteOrder.mutateAsync(order.id);
      toast.success('Ordem de serviço excluída com sucesso!');
      navigate('/ordens');
    } catch (error: any) {
      toast.error('Erro ao excluir ordem de serviço', { description: error.message });
    }
  };

  const handleSendReport = async (sendTo: ('imobiliaria' | 'tecnico' | 'proprietario')[]) => {
    const labelMap: Record<string, string> = { imobiliaria: 'imobiliária', tecnico: 'técnico', proprietario: 'proprietário' };
    const label = sendTo.map(s => labelMap[s] || s).join(' e ');
    setSendingReportTo(sendTo.join(','));
    try {
      const reportUrl = `${window.location.origin}/ordens/${order.id}/relatorio`;
      const { data, error } = await supabase.functions.invoke('send-completion-report', {
        body: { serviceOrderId: order.id, reportUrl, sendTo },
      });
      if (error) throw error;
      if (data?.emailSent) {
        toast.success(`Relatório enviado para ${label}!`);
      } else {
        toast.info(data?.message || 'E-mail não enviado.');
      }
    } catch (error: any) {
      toast.error(`Erro ao enviar relatório para ${label}`, { description: error.message });
    } finally {
      setSendingReportTo(null);
    }
  };

  const isMutating = updateOrder.isPending || createReport.isPending;

  const renderActionSection = () => {
    switch (role) {
      case 'tecnico':
        if (order.status === 'aguardando_orcamento_prestador') {
          return (
            <div className="os-card">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Enviar Orçamento</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Descrição do serviço necessário</Label>
                  <Textarea placeholder="Descreva o que precisa ser feito..." value={techQuote.description} onChange={(e) => setTechQuote(prev => ({ ...prev, description: e.target.value }))} rows={3} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Mão de Obra (R$)</Label>
                    <Input type="number" placeholder="0.00" value={techQuote.laborCost || ''} onChange={(e) => setTechQuote(prev => ({ ...prev, laborCost: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label>Materiais (R$)</Label>
                    <Input type="number" placeholder="0.00" value={techQuote.materialCost || ''} onChange={(e) => setTechQuote(prev => ({ ...prev, materialCost: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label>Impostos (R$)</Label>
                    <Input type="number" placeholder="0.00" value={techQuote.taxCost || ''} onChange={(e) => setTechQuote(prev => ({ ...prev, taxCost: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                {(techQuote.laborCost + techQuote.materialCost + techQuote.taxCost) > 0 && (
                  <div className="p-3 bg-secondary/50 rounded-lg text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-bold text-foreground">R$ {(techQuote.laborCost + techQuote.materialCost + techQuote.taxCost).toFixed(2)}</span>
                  </div>
                )}
                <div>
                  <Label>Prazo (dias)</Label>
                  <Input type="number" placeholder="1" value={techQuote.deadline} onChange={(e) => setTechQuote(prev => ({ ...prev, deadline: parseInt(e.target.value) || 1 }))} />
                </div>
                <Button onClick={handleTechnicianSubmit} className="w-full" disabled={isMutating}>
                  {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar Orçamento
                </Button>
              </div>
            </div>
          );
        }
        if (order.status === 'aprovado_aguardando') {
          return (
            <div className="os-card">
              <Button onClick={handleStartExecution} variant="default" className="w-full" size="lg" disabled={isMutating}>
                {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Iniciar Execução
              </Button>
            </div>
          );
        }
        if (order.status === 'em_execucao') {
          return (
            <CompletionReportForm
              serviceOrderId={order.id}
              onSubmit={handleCompleteService}
              isSubmitting={isMutating}
            />
          );
        }
        break;

      case 'admin': {
        const sections = [];
        
        // Technician assignment (show whenever no tech assigned and not completed)
        if (!order.tecnicoId && order.status !== 'concluido') {
          sections.push(
            <div key="assign" className="os-card border-2 border-primary/30">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Designar Técnico</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Selecionar técnico</Label>
                  <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um técnico..." />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name} {tech.company ? `(${tech.company})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssignTechnician} className="w-full" disabled={isMutating || !selectedTechnicianId}>
                  {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Designar Técnico
                </Button>
              </div>
            </div>
          );
        } else if (order.tecnicoId && order.status === 'aguardando_orcamento_prestador') {
          sections.push(
            <div key="assigned" className="os-card border-2 border-primary/30">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Técnico Designado</h2>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">Técnico designado</p>
                <p className="text-lg font-semibold text-foreground">{order.tecnico?.name || 'Técnico atribuído'}</p>
                <p className="text-sm text-muted-foreground">Aguardando envio do orçamento pelo técnico</p>
              </div>
            </div>
          );
        }

        // Admin pricing review
        if (order.status === 'aguardando_aprovacao_admin') {
          sections.push(
            <div key="pricing" className="os-card border-2 border-accent/30">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-accent" />
                <h2 className="font-display font-semibold text-lg">Revisar Valor Final</h2>
              </div>
              <div className="space-y-4">
                {/* Itemized costs */}
                <div className="grid gap-3 md:grid-cols-3">
                  {order.laborCost != null && order.laborCost > 0 && (
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Mão de Obra</p>
                      <p className="text-lg font-bold text-foreground">R$ {order.laborCost.toFixed(2)}</p>
                    </div>
                  )}
                  {order.materialCost != null && order.materialCost > 0 && (
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Materiais</p>
                      <p className="text-lg font-bold text-foreground">R$ {order.materialCost.toFixed(2)}</p>
                    </div>
                  )}
                  {order.taxCost != null && order.taxCost > 0 && (
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Impostos</p>
                      <p className="text-lg font-bold text-foreground">R$ {order.taxCost.toFixed(2)}</p>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Custo Total do Técnico</p>
                  <p className="text-2xl font-bold text-foreground">R$ {order.technicianCost?.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor sugerido (+40%)</p>
                  <p className="text-lg font-semibold text-accent">R$ {(order.technicianCost ? (order.technicianCost * 1.4).toFixed(2) : '0.00')}</p>
                </div>
                <div>
                  <Label className="text-base font-semibold">Valor Final para a Imobiliária (R$)</Label>
                  <p className="text-sm text-muted-foreground mb-2">O valor já vem com +40% aplicado. Ajuste se necessário.</p>
                  <Input type="number" placeholder="0.00" value={finalPrice || ''} onChange={(e) => setFinalPrice(parseFloat(e.target.value) || 0)} className="text-xl font-bold" />
                  {finalPrice > 0 && order.technicianCost && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Margem: <strong className="text-status-completed">R$ {(finalPrice - order.technicianCost).toFixed(2)}</strong> ({((finalPrice - order.technicianCost) / order.technicianCost * 100).toFixed(0)}%)
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-base font-semibold">Forma de Pagamento</Label>
                  <Select
                    value={order.paymentMethod || ''}
                    onValueChange={async (value) => {
                      try {
                        await updateOrder.mutateAsync({ id: order.id, payment_method: value });
                        toast.success('Forma de pagamento salva!');
                      } catch (e: any) {
                        toast.error('Erro ao salvar', { description: e.message });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imobiliaria">Pgto via Imobiliária</SelectItem>
                      <SelectItem value="pix">Pgto PIX</SelectItem>
                      <SelectItem value="cartao">Pgto Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdminApprove} className="w-full" size="lg" disabled={isMutating}>
                  {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Aprovar e Enviar Orçamento
                </Button>
              </div>
            </div>
          );
        }

        return sections.length > 0 ? <>{sections}</> : null;
      }

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
                  <p className="text-4xl font-bold text-primary mt-1">R$ {order.finalPrice?.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Prazo: {order.estimatedDeadline} {order.estimatedDeadline === 1 ? 'dia' : 'dias'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleRequestRevision} disabled={isMutating}>
                    Solicitar Revisão
                  </Button>
                  <Button onClick={handleClientApprove} variant="default" className="flex-1" disabled={isMutating}>
                    {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
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
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-3xl font-bold text-foreground">{order.osNumber}</h1>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-muted-foreground">
                Aberto em {format(order.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {order.finalPrice && role !== 'tecnico' && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/ordens/${order.id}/orcamento`}>
                    <FileDown className="h-3.5 w-3.5" />
                    Orçamento PDF
                  </Link>
                </Button>
              )}
              {role === 'admin' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Ordem de Serviço</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a OS <strong>{order.osNumber}</strong>? Esta ação não pode ser desfeita. Todos os itens, relatórios e dados relacionados serão removidos permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteOrder}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Excluir OS
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <UrgencyIndicator urgency={order.urgency} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="os-card">
              <h2 className="font-display font-semibold text-lg mb-3">Problema Reportado</h2>
              <p className="text-foreground">{order.problem}</p>
              {order.photos && order.photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Fotos do problema ({order.photos.length})</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {order.photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors">
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {order.technicianDescription && (
              <div className="os-card">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">Diagnóstico do Técnico</h2>
                </div>
                <p className="text-foreground mb-4">{order.technicianDescription}</p>
                <div className="flex gap-4">
                  {role === 'admin' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Custo: R$ {order.technicianCost?.toFixed(2)}
                    </div>
                  )}
                  {role === 'tecnico' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Custo informado: R$ {order.technicianCost?.toFixed(2)}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Prazo: {order.estimatedDeadline} {order.estimatedDeadline === 1 ? 'dia' : 'dias'}
                  </div>
                </div>
              </div>
            )}

            {order.completionReport && (
              <div className="os-card border-2 border-status-completed/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-status-completed" />
                    <h2 className="font-display font-semibold text-lg">Relatório de Conclusão</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {role === 'admin' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReport(['imobiliaria'])}
                          disabled={!!sendingReportTo}
                        >
                          {sendingReportTo?.includes('imobiliaria') && !sendingReportTo?.includes('tecnico') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          Enviar p/ Imobiliária
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReport(['tecnico'])}
                          disabled={!!sendingReportTo}
                        >
                          {sendingReportTo === 'tecnico' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          Enviar p/ Técnico
                        </Button>
                        {order.property.ownerEmail ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendReport(['proprietario'])}
                            disabled={!!sendingReportTo}
                          >
                            {sendingReportTo === 'proprietario' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                            Enviar p/ Proprietário
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled title="Cadastre o e-mail do proprietário no imóvel">
                            <Mail className="h-3.5 w-3.5" />
                            Proprietário (sem e-mail)
                          </Button>
                        )}
                      </>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/ordens/${order.id}/relatorio`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver Relatório Completo
                      </Link>
                    </Button>
                  </div>
                </div>
                <p className="text-foreground mb-4">{order.completionReport.description}</p>

                {/* Photo thumbnails */}
                {((order.completionReport.photosBefore?.length > 0) || (order.completionReport.photosAfter?.length > 0)) && (
                  <div className="grid gap-4 md:grid-cols-2 mb-4">
                    {order.completionReport.photosBefore?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Antes ({order.completionReport.photosBefore.length} fotos)</p>
                        <div className="flex gap-1">
                          {order.completionReport.photosBefore.slice(0, 3).map((url: string, i: number) => (
                            <div key={i} className="w-16 h-12 rounded-md overflow-hidden border border-border">
                              <img src={url} alt={`Antes ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {order.completionReport.photosBefore.length > 3 && (
                            <div className="w-16 h-12 rounded-md bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                              +{order.completionReport.photosBefore.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {order.completionReport.photosAfter?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Depois ({order.completionReport.photosAfter.length} fotos)</p>
                        <div className="flex gap-1">
                          {order.completionReport.photosAfter.slice(0, 3).map((url: string, i: number) => (
                            <div key={i} className="w-16 h-12 rounded-md overflow-hidden border border-border">
                              <img src={url} alt={`Depois ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {order.completionReport.photosAfter.length > 3 && (
                            <div className="w-16 h-12 rounded-md bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                              +{order.completionReport.photosAfter.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Checklist:</p>
                  <div className="space-y-1">
                    {order.completionReport.checklist.map((item: any) => (
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

            {renderActionSection()}

            {/* Comments Section */}
            <ServiceOrderComments serviceOrderId={order.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="os-card">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Imóvel</h3>
              </div>
              <p className="text-sm text-foreground">{order.property.address}</p>
              <p className="text-sm text-muted-foreground">{order.property.neighborhood}, {order.property.city}</p>
              {order.property.tenantName && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Inquilino</p>
                  <p className="text-sm text-foreground">{order.property.tenantName}</p>
                  {order.property.tenantPhone && (
                    <a href={`tel:${order.property.tenantPhone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-1">
                      <Phone className="h-3.5 w-3.5" />
                      {formatPhone(order.property.tenantPhone)}
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="os-card">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Imobiliária</h3>
              </div>
              <p className="text-sm text-foreground">{order.imobiliaria.company || order.imobiliaria.name}</p>
              <p className="text-sm text-muted-foreground">{order.imobiliaria.name}</p>
            </div>

            <div className="os-card">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Solicitante</h3>
              </div>
              <p className="text-sm text-foreground">{order.requesterName}</p>
            </div>

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
                    <p className="text-muted-foreground">{format(order.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
                {order.quoteSentAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-status-pending mt-1.5" />
                    <div>
                      <p className="font-medium">Orçamento enviado</p>
                      <p className="text-muted-foreground">{format(order.quoteSentAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                )}
                {order.adminApprovedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-status-in-progress mt-1.5" />
                    <div>
                      <p className="font-medium">Aprovado pelo admin</p>
                      <p className="text-muted-foreground">{format(order.adminApprovedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                )}
                {order.clientApprovedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-status-approved mt-1.5" />
                    <div>
                      <p className="font-medium">Aprovado pelo cliente</p>
                      <p className="text-muted-foreground">{format(order.clientApprovedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-status-completed mt-1.5" />
                    <div>
                      <p className="font-medium">Serviço concluído</p>
                      <p className="text-muted-foreground">{format(order.completedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
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
