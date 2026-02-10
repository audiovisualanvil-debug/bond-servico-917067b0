import { useParams, useNavigate } from 'react-router-dom';
import { useServiceOrder } from '@/hooks/useServiceOrders';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Printer, Loader2, Pencil, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { typedFrom } from '@/integrations/supabase/helpers';
import logoFazTudo from '@/assets/logo-faztudo.png';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface ServiceOrderItem {
  id: string;
  description: string;
}

const WARRANTY_OPTIONS = [
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
  { value: '120', label: '120 dias' },
  { value: '180', label: '180 dias' },
  { value: '365', label: '1 ano' },
];

const VALIDITY_OPTIONS = [
  { value: '7', label: '7 dias' },
  { value: '10', label: '10 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
];

const getDefaultTerms = (warrantyDays: string, validityDays: string) => [
  'O prazo inicia após a aprovação formal do orçamento.',
  `Valores válidos por ${VALIDITY_OPTIONS.find(v => v.value === validityDays)?.label || validityDays + ' dias'} a partir da data de emissão.`,
  'Materiais e mão de obra inclusos no valor apresentado.',
  `Garantia de ${WARRANTY_OPTIONS.find(w => w.value === warrantyDays)?.label || warrantyDays + ' dias'} sobre o serviço executado.`,
];

const OrcamentoPDF = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: order, isLoading, error } = useServiceOrder(id);
  const [warrantyDays, setWarrantyDays] = useState('90');
  const [validityDays, setValidityDays] = useState('15');
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [terms, setTerms] = useState<string[]>(getDefaultTerms('90', '15'));

  const handleWarrantyChange = (value: string) => {
    setWarrantyDays(value);
    setTerms(prev => prev.map(t =>
      t.startsWith('Garantia de ')
        ? `Garantia de ${WARRANTY_OPTIONS.find(w => w.value === value)?.label || value + ' dias'} sobre o serviço executado.`
        : t
    ));
  };

  const handleValidityChange = (value: string) => {
    setValidityDays(value);
    setTerms(prev => prev.map(t =>
      t.startsWith('Valores válidos por ')
        ? `Valores válidos por ${VALIDITY_OPTIONS.find(v => v.value === value)?.label || value + ' dias'} a partir da data de emissão.`
        : t
    ));
  };
  // Fetch service order items (without real_cost for privacy)
  const { data: items = [] } = useQuery({
    queryKey: ['service-order-items', id],
    queryFn: async () => {
      const { data, error } = await typedFrom('service_order_items')
        .select('id, description')
        .eq('service_order_id', id);
      if (error) throw error;
      return (data || []) as ServiceOrderItem[];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {error ? 'Erro ao carregar orçamento' : 'Ordem de serviço não encontrada'}
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  // Only show if order has a final price (budget was approved by admin)
  if (!order.finalPrice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Orçamento ainda não disponível para esta OS.</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Action bar - hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* PDF content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-full">
        <div className="bg-card border border-border rounded-xl print:border-0 print:rounded-none overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-hero text-primary-foreground p-8 print:p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img src={logoFazTudo} alt="Faz-Tudo Imobiliário" className="h-16 w-16 rounded-full object-cover print:h-14 print:w-14" />
                <div>
                  <h1 className="text-2xl font-display font-bold">ORÇAMENTO DE SERVIÇO</h1>
                  <p className="text-primary-foreground/80 mt-1 text-sm">Faz-Tudo Imobiliário</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-display font-bold">{order.osNumber}</p>
                <p className="text-primary-foreground/80 text-sm mt-1">
                  {order.adminApprovedAt
                    ? format(order.adminApprovedAt, "dd/MM/yyyy", { locale: ptBR })
                    : format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 print:p-6 space-y-8">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-6 print:gap-4">
              <InfoBlock
                label="Imóvel"
                value={order.property.address}
                subtext={`${order.property.neighborhood}, ${order.property.city} - ${order.property.state}`}
              />
              <InfoBlock
                label="Imobiliária"
                value={order.imobiliaria.company || order.imobiliaria.name}
                subtext={order.imobiliaria.email}
              />
              <InfoBlock label="Solicitante" value={order.requesterName} />
              {order.property.ownerName && (
                <InfoBlock
                  label="Proprietário"
                  value={order.property.ownerName}
                  subtext={order.property.ownerPhone || undefined}
                />
              )}
              {order.property.tenantName && (
                <InfoBlock
                  label="Inquilino"
                  value={order.property.tenantName}
                  subtext={order.property.tenantPhone || undefined}
                />
              )}
              <InfoBlock
                label="Data de Abertura"
                value={format(order.createdAt, "dd/MM/yyyy", { locale: ptBR })}
              />
            </div>

            <hr className="border-border" />

            {/* Problem */}
            <Section title="Problema Reportado">
              <p className="text-foreground text-sm leading-relaxed">{order.problem}</p>
            </Section>

            {/* Photos */}
            {order.photos && order.photos.length > 0 && (
              <Section title="Fotos do Problema">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {order.photos.map((url, i) => (
                    <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden border border-border">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Technical description */}
            {order.technicianDescription && (
              <Section title="Diagnóstico Técnico">
                <p className="text-foreground text-sm leading-relaxed">{order.technicianDescription}</p>
              </Section>
            )}

            {/* Service items */}
            {items.length > 0 && (
              <Section title="Itens do Serviço">
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={item.id} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-secondary/30">
                      <span className="font-medium text-muted-foreground min-w-[24px]">{i + 1}.</span>
                      <span className="text-foreground">{item.description}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <hr className="border-border" />

            {/* Pricing */}
            {role !== 'tecnico' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 bg-primary/5 rounded-xl">
                  <span className="text-base font-medium text-muted-foreground">Valor Total do Serviço</span>
                  <span className="text-3xl font-display font-bold text-primary">
                    R$ {order.finalPrice.toFixed(2)}
                  </span>
                </div>

                {order.estimatedDeadline && (
                  <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                    <span className="text-sm font-medium text-muted-foreground">Prazo Estimado</span>
                    <span className="text-lg font-semibold text-foreground">
                      {order.estimatedDeadline} {order.estimatedDeadline === 1 ? 'dia útil' : 'dias úteis'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Terms */}
            <Section title="Condições" action={role === 'admin' ? (
              <Button
                variant="ghost"
                size="sm"
                className="print:hidden h-7 px-2"
                onClick={() => setIsEditingTerms(!isEditingTerms)}
              >
                {isEditingTerms ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                {isEditingTerms ? 'Concluir' : 'Editar'}
              </Button>
            ) : undefined}>
              {isEditingTerms ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Garantia:</span>
                      <Select value={warrantyDays} onValueChange={handleWarrantyChange}>
                        <SelectTrigger className="w-[130px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WARRANTY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Validade:</span>
                      <Select value={validityDays} onValueChange={handleValidityChange}>
                        <SelectTrigger className="w-[130px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VALIDITY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {terms.map((term, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-sm text-muted-foreground mt-2 min-w-[16px]">•</span>
                      <Textarea
                        value={term}
                        onChange={(e) => {
                          const newTerms = [...terms];
                          newTerms[i] = e.target.value;
                          setTerms(newTerms);
                        }}
                        rows={1}
                        className="text-sm min-h-[36px]"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-7 px-1.5 shrink-0"
                        onClick={() => setTerms(terms.filter((_, idx) => idx !== i))}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTerms([...terms, ''])}
                    className="mt-1"
                  >
                    + Adicionar condição
                  </Button>
                </div>
              ) : (
                <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                  {terms.filter(t => t.trim()).map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Approval area */}
            <hr className="border-border" />
            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="text-center">
                <div className="border-b-2 border-foreground/30 pb-1 mb-2 mx-4 min-h-[40px]" />
                <p className="text-xs text-muted-foreground">Aprovação do Cliente</p>
                <p className="text-xs text-muted-foreground mt-0.5">Data: ____/____/________</p>
              </div>
              <div className="text-center">
                <div className="border-b-2 border-foreground/30 pb-1 mb-2 mx-4 min-h-[40px]" />
                <p className="text-xs text-muted-foreground">Faz-Tudo Imobiliário</p>
                <p className="text-xs text-muted-foreground mt-0.5">Responsável Técnico</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Faz-Tudo Imobiliário — Orçamento de Serviço — {order.osNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este documento é gerado automaticamente e tem validade como proposta comercial.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-base text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoBlock({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
    </div>
  );
}

export default OrcamentoPDF;
