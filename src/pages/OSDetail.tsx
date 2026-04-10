import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ServiceOrderComments } from '@/components/ServiceOrderComments';
import { CompletionReportForm } from '@/components/CompletionReportForm';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useServiceOrder, useUpdateServiceOrder, useCreateCompletionReport, useDeleteServiceOrder } from '@/hooks/useServiceOrders';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useAuditLog } from '@/hooks/useAuditLog';

// Subcomponents
import { OSDetailHeader } from '@/components/os-detail/OSDetailHeader';
import { OSDetailSidebar } from '@/components/os-detail/OSDetailSidebar';
import { OSProblemSection, OSDiagnosticSection, OSCompletionSection } from '@/components/os-detail/OSDetailContent';
import {
  TechQuoteForm, StartExecutionButton,
  AssignTechSection, AssignedTechInfo, AdminPricingSection,
  ClientApproveSection,
} from '@/components/os-detail/OSActionSections';

const OSDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();

  const { data: order, isLoading, error } = useServiceOrder(id);
  const updateOrder = useUpdateServiceOrder();
  const createReport = useCreateCompletionReport();
  const deleteOrder = useDeleteServiceOrder();
  const { data: technicians = [] } = useTechnicians();
  const { log: auditLog } = useAuditLog();

  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [sendingReportTo, setSendingReportTo] = useState<string | null>(null);
  const [techQuote, setTechQuote] = useState({
    description: '', laborCost: 0, materialCost: 0, taxCost: 0, deadline: 1,
  });
  const [finalPrice, setFinalPrice] = useState(0);

  // FIX: Move initialization to useEffect instead of setState during render
  useEffect(() => {
    if (!order) return;
    if (order.technicianDescription && techQuote.description === '') {
      setTechQuote({
        description: order.technicianDescription,
        laborCost: order.laborCost || 0,
        materialCost: order.materialCost || 0,
        taxCost: order.taxCost || 0,
        deadline: order.estimatedDeadline || 1,
      });
    }
    if (finalPrice === 0) {
      if (order.finalPrice) {
        setFinalPrice(order.finalPrice);
      } else if (order.technicianCost) {
        setFinalPrice(Math.round(order.technicianCost * 1.4 * 100) / 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

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
          <Button className="mt-4" onClick={() => navigate('/ordens')}>Voltar para lista</Button>
        </div>
      </DashboardLayout>
    );
  }

  const isMutating = updateOrder.isPending || createReport.isPending;

  // ---------- Handlers ----------

  const handleTechnicianSubmit = async () => {
    if (!techQuote.description.trim()) { toast.error('Preencha a descrição do serviço'); return; }
    const totalCost = techQuote.laborCost + techQuote.materialCost + techQuote.taxCost;
    if (totalCost <= 0) { toast.error('Informe ao menos um valor de custo'); return; }
    try {
      await updateOrder.mutateAsync({
        id: order.id, technician_description: techQuote.description.trim(),
        labor_cost: techQuote.laborCost, material_cost: techQuote.materialCost,
        tax_cost: techQuote.taxCost, technician_cost: totalCost,
        estimated_deadline: techQuote.deadline, status: 'aguardando_aprovacao_admin',
      });
      supabase.functions.invoke('notify-status-change', { body: { serviceOrderId: order.id, newStatus: 'aguardando_aprovacao_admin' } }).catch(console.error);
      toast.success('Orçamento enviado!');
    } catch (e: any) { toast.error('Erro ao enviar orçamento', { description: e.message }); }
  };

  const handleAssignTechnician = async () => {
    if (!selectedTechnicianId) { toast.error('Selecione um profissional'); return; }
    try {
      await updateOrder.mutateAsync({ id: order.id, tecnico_id: selectedTechnicianId });
      auditLog({ action: 'assign_technician', entity_type: 'service_order', entity_id: order.id, details: { os_number: order.osNumber, tecnico_id: selectedTechnicianId } });
      supabase.functions.invoke('notify-status-change', { body: { serviceOrderId: order.id, newStatus: 'aguardando_orcamento_prestador' } }).catch(console.error);
      toast.success('Profissional designado!');
    } catch (e: any) { toast.error('Erro ao designar', { description: e.message }); }
  };

  const handleAdminApprove = async () => {
    try {
      await updateOrder.mutateAsync({ id: order.id, final_price: finalPrice, payment_method: order.paymentMethod || undefined, status: 'enviado_imobiliaria' });
      auditLog({ action: 'approve_budget', entity_type: 'service_order', entity_id: order.id, details: { os_number: order.osNumber, final_price: finalPrice } });
      supabase.functions.invoke('send-budget-approved', { body: { serviceOrderId: order.id } }).catch(console.error);
      supabase.functions.invoke('notify-status-change', { body: { serviceOrderId: order.id, newStatus: 'enviado_imobiliaria' } }).catch(console.error);
      toast.success('Orçamento aprovado e enviado!');
    } catch (e: any) { toast.error('Erro ao aprovar', { description: e.message }); }
  };

  const handlePaymentChange = async (value: string) => {
    try {
      await updateOrder.mutateAsync({ id: order.id, payment_method: value });
      auditLog({ action: 'change_payment_method', entity_type: 'service_order', entity_id: order.id, details: { os_number: order.osNumber, payment_method: value } });
      toast.success('Forma de pagamento salva!');
    } catch (e: any) { toast.error('Erro ao salvar', { description: e.message }); }
  };

  const handleRequestRevision = async () => {
    try { await updateOrder.mutateAsync({ id: order.id, status: 'aguardando_aprovacao_admin' }); auditLog({ action: 'request_revision', entity_type: 'service_order', entity_id: order.id, details: { os_number: order.osNumber } }); toast.success('Revisão solicitada!'); }
    catch (e: any) { toast.error('Erro', { description: e.message }); }
  };

  const handleClientApprove = async () => {
    try { await updateOrder.mutateAsync({ id: order.id, status: 'aprovado_aguardando' }); auditLog({ action: 'client_approve', entity_type: 'service_order', entity_id: order.id, details: { os_number: order.osNumber } }); supabase.functions.invoke('notify-status-change', { body: { serviceOrderId: order.id, newStatus: 'aprovado_aguardando' } }).catch(console.error); toast.success('Serviço aprovado!'); }
    catch (e: any) { toast.error('Erro', { description: e.message }); }
  };

  const handleStartExecution = async () => {
    try { await updateOrder.mutateAsync({ id: order.id, status: 'em_execucao' }); auditLog({ action: 'start_execution', entity_type: 'service_order', entity_id: order.id, details: { os_number: order.osNumber } }); supabase.functions.invoke('notify-status-change', { body: { serviceOrderId: order.id, newStatus: 'em_execucao' } }).catch(console.error); toast.success('Execução iniciada!'); }
    catch (e: any) { toast.error('Erro', { description: e.message }); }
  };

  const handleCompleteService = async (reportData: any) => {
    try {
      await createReport.mutateAsync({
        service_order_id: order.id, description: reportData.description,
        checklist: reportData.checklist, photos_before: reportData.photosBefore,
        photos_after: reportData.photosAfter, observations: reportData.observations || undefined,
        technician_signature: reportData.technicianSignature,
      });
      await updateOrder.mutateAsync({ id: order.id, status: 'concluido' });
      auditLog({ action: 'complete_service', entity_type: 'service_order', entity_id: order.id, details: { os_number: order.osNumber } });
      const reportUrl = `${window.location.origin}/ordens/${order.id}/relatorio`;
      supabase.functions.invoke('send-completion-report', { body: { serviceOrderId: order.id, reportUrl } }).catch(console.error);
      supabase.functions.invoke('notify-status-change', { body: { serviceOrderId: order.id, newStatus: 'concluido' } }).catch(console.error);
      toast.success('Serviço finalizado!');
    } catch (e: any) { toast.error('Erro ao finalizar', { description: e.message }); }
  };

  const handleDeleteOrder = async () => {
    try { const osNumber = order.osNumber; await deleteOrder.mutateAsync(order.id); auditLog({ action: 'delete_order', entity_type: 'service_order', entity_id: order.id, details: { os_number: osNumber } }); toast.success('OS excluída!'); navigate('/ordens'); }
    catch (e: any) { toast.error('Erro ao excluir', { description: e.message }); }
  };

  const handleSendReport = async (sendTo: ('imobiliaria' | 'tecnico' | 'proprietario')[]) => {
    setSendingReportTo(sendTo.join(','));
    try {
      const reportUrl = `${window.location.origin}/ordens/${order.id}/relatorio`;
      const { data, error } = await supabase.functions.invoke('send-completion-report', { body: { serviceOrderId: order.id, reportUrl, sendTo } });
      if (error) throw error;
      if (data?.emailSent) toast.success('Relatório enviado!');
      else toast.info(data?.message || 'E-mail não enviado.');
    } catch (e: any) { toast.error('Erro ao enviar relatório', { description: e.message }); }
    finally { setSendingReportTo(null); }
  };

  // ---------- Action section by role ----------

  const renderActionSection = () => {
    if (role === 'tecnico') {
      if (order.status === 'aguardando_orcamento_prestador')
        return <TechQuoteForm techQuote={techQuote} setTechQuote={setTechQuote} onSubmit={handleTechnicianSubmit} isMutating={isMutating} />;
      if (order.status === 'aprovado_aguardando')
        return <StartExecutionButton onStart={handleStartExecution} isMutating={isMutating} />;
      if (order.status === 'em_execucao')
        return <CompletionReportForm serviceOrderId={order.id} onSubmit={handleCompleteService} isSubmitting={isMutating} />;
    }

    if (role === 'admin') {
      const sections = [];
      if (!order.tecnicoId && order.status !== 'concluido')
        sections.push(<AssignTechSection key="assign" technicians={technicians} selectedId={selectedTechnicianId} onSelect={setSelectedTechnicianId} onAssign={handleAssignTechnician} isMutating={isMutating} />);
      else if (order.tecnicoId && order.status === 'aguardando_orcamento_prestador')
        sections.push(<AssignedTechInfo key="assigned" name={order.tecnico?.name || 'Profissional atribuído'} />);
      if (order.status === 'aguardando_aprovacao_admin')
        sections.push(<AdminPricingSection key="pricing" order={order} finalPrice={finalPrice} setFinalPrice={setFinalPrice} onApprove={handleAdminApprove} onPaymentChange={handlePaymentChange} isMutating={isMutating} />);
      return sections.length > 0 ? <>{sections}</> : null;
    }

    if (role === 'imobiliaria' && order.status === 'enviado_imobiliaria')
      return <ClientApproveSection order={order} onApprove={handleClientApprove} onRevision={handleRequestRevision} isMutating={isMutating} />;

    return null;
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <OSDetailHeader order={order} role={role || ''} isDeleting={deleteOrder.isPending} onDelete={handleDeleteOrder} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <OSProblemSection order={order} />
            <OSDiagnosticSection order={order} role={role || ''} />
            <OSCompletionSection order={order} role={role || ''} sendingReportTo={sendingReportTo} onSendReport={handleSendReport} />
            {renderActionSection()}
            <ServiceOrderComments serviceOrderId={order.id} />
          </div>
          <OSDetailSidebar order={order} role={role || 'imobiliaria'} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OSDetail;
