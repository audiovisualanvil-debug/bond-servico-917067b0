import { useParams, useNavigate } from 'react-router-dom';
import { useServiceOrder } from '@/hooks/useServiceOrders';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Printer, Download, CheckCircle2, XCircle, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { typedFrom } from '@/integrations/supabase/helpers';
import logoFazTudo from '@/assets/logo-faztudo.png';

interface ReportComment {
  id: string;
  message: string;
  visible_to_imobiliaria: boolean;
  created_at: string;
  profile?: { name: string; company: string | null } | null;
}

const WARRANTY_OPTIONS = [
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
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

const PAYMENT_OPTIONS = [
  { value: 'imobiliaria', label: 'Pgto via Imobiliária' },
  { value: 'pix', label: 'Pgto PIX' },
  { value: 'cartao', label: 'Pgto Cartão' },
];
const RelatorioOS = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: order, isLoading, error } = useServiceOrder(id);
  const [warrantyDays, setWarrantyDays] = useState('90');
  const [validityDays, setValidityDays] = useState('30');
  const [paymentMethod, setPaymentMethod] = useState<string>(order?.paymentMethod || 'imobiliaria');
  const [isDownloading, setIsDownloading] = useState(false);
  const [comments, setComments] = useState<ReportComment[]>([]);

  // Fetch comments for this OS
  useEffect(() => {
    if (!id) return;
    const fetchComments = async () => {
      try {
        const { data, error } = await typedFrom('service_order_comments')
          .select('*, profile:profiles!service_order_comments_user_id_fkey(name, company)')
          .eq('service_order_id', id)
          .order('created_at', { ascending: true });
        if (error) {
          const { data: fallback } = await typedFrom('service_order_comments')
            .select('*')
            .eq('service_order_id', id)
            .order('created_at', { ascending: true });
          setComments((fallback || []) as ReportComment[]);
        } else {
          setComments((data || []) as ReportComment[]);
        }
      } catch (e) {
        console.error('Error fetching comments for report:', e);
      }
    };
    fetchComments();
  }, [id]);

  // Sync payment method when order loads
  if (order?.paymentMethod && paymentMethod !== order.paymentMethod && paymentMethod === 'imobiliaria') {
    setPaymentMethod(order.paymentMethod);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order || !order.completionReport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {error ? 'Erro ao carregar relatório' : 'Relatório não encontrado'}
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  const report = order.completionReport;

  const handlePrint = () => {
    window.print();
  };

  const convertImagesToBase64 = async (container: HTMLElement) => {
    const images = container.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(async (img) => {
        if (img.src.startsWith('data:')) return;
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          img.src = base64;
        } catch (e) {
          console.warn('Could not convert image to base64:', img.src, e);
        }
      })
    );
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !order) return;
    setIsDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      await convertImagesToBase64(clone);
      const opt = {
        margin: 0,
        filename: `FazTudo_${format(order.createdAt, 'dd-MM-yyyy')}_${(order.imobiliaria.company || order.imobiliaria.name).replace(/\s+/g, '_')}_${order.osNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(clone).save();
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Action bar - hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Garantia:</span>
              <Select value={warrantyDays} onValueChange={setWarrantyDays}>
                <SelectTrigger className="h-8 w-28 text-xs">
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
              <span className="text-xs text-muted-foreground">Validade:</span>
              <Select value={validityDays} onValueChange={setValidityDays}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALIDITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Pagamento:</span>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-full">
        <div ref={reportRef} className="bg-card border border-border rounded-xl print:border-0 print:rounded-none overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-hero text-primary-foreground p-8 print:p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img src={logoFazTudo} alt="Faz-Tudo Imobiliário" className="h-16 w-16 rounded-full object-cover print:h-14 print:w-14" />
                <div>
                  <h1 className="text-2xl font-display font-bold">RELATÓRIO FINAL</h1>
                  <p className="text-primary-foreground/80 mt-1 text-sm">Faz-Tudo Imobiliário</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-display font-bold">{order.osNumber}</p>
                <p className="text-primary-foreground/80 text-sm mt-1">
                  {format(report.completedAt, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 print:p-6 space-y-8">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-6 print:gap-4">
              <InfoBlock label="Imóvel" value={order.property.address} subtext={`${order.property.neighborhood}, ${order.property.city} - ${order.property.state}`} />
              <InfoBlock label="Imobiliária" value={order.imobiliaria.company || order.imobiliaria.name} subtext={order.imobiliaria.email} />
              <InfoBlock label="Solicitante" value={order.requesterName} />
              <InfoBlock label="Técnico Responsável" value={order.tecnico?.name || 'N/A'} subtext={order.tecnico?.phone} />
              <InfoBlock label="Data de Abertura" value={format(order.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              <InfoBlock label="Data de Conclusão" value={format(report.completedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
            </div>

            <hr className="border-border" />

            {/* Problem */}
            <Section title="Problema Reportado">
              <p className="text-foreground text-sm leading-relaxed">{order.problem}</p>
            </Section>

            {/* Technician Description */}
            {order.technicianDescription && (
              <Section title="Diagnóstico Técnico">
                <p className="text-foreground text-sm leading-relaxed">{order.technicianDescription}</p>
              </Section>
            )}

            {/* Service Description */}
            <Section title="Serviço Executado">
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{report.description}</p>
            </Section>

            {/* Checklist */}
            {report.checklist && report.checklist.length > 0 && (
              <Section title="Checklist de Verificação">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {report.checklist.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-secondary/30">
                      {item.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-status-completed flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>{item.item}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Photos */}
            {((report.photosBefore && report.photosBefore.length > 0) || (report.photosAfter && report.photosAfter.length > 0)) && (
              <Section title="Registro Fotográfico">
                <div className="grid gap-6 md:grid-cols-2">
                  {report.photosBefore && report.photosBefore.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">📷 Antes</p>
                      <div className="grid grid-cols-2 gap-2">
                        {report.photosBefore.map((url: string, i: number) => (
                          <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden border border-border">
                            <img src={url} alt={`Antes ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.photosAfter && report.photosAfter.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">📷 Depois</p>
                      <div className="grid grid-cols-2 gap-2">
                        {report.photosAfter.map((url: string, i: number) => (
                          <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden border border-border">
                            <img src={url} alt={`Depois ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Histórico de Conversas / Comentários */}
            {comments.length > 0 && (
              <Section title="Histórico de Acompanhamento">
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground text-xs">
                            {comment.profile?.name || 'Usuário'}
                            {comment.profile?.company ? ` (${comment.profile.company})` : ''}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-foreground whitespace-pre-wrap text-xs leading-relaxed">{comment.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Observations */}
            {report.observations && (
              <Section title="Observações e Recomendações">
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{report.observations}</p>
              </Section>
            )}

            {/* Pricing - hidden from technicians */}
            {order.finalPrice && role !== 'tecnico' && (
              <>
                <hr className="border-border" />
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl">
                  <span className="text-sm font-medium text-muted-foreground">Valor do Serviço</span>
                  <span className="text-2xl font-display font-bold text-primary">
                    R$ {order.finalPrice.toFixed(2)}
                  </span>
                </div>
              </>
            )}

            {/* Warranty, Validity & Payment */}
            <Section title="Condições">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Garantia do Serviço</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {WARRANTY_OPTIONS.find(w => w.value === warrantyDays)?.label || warrantyDays + ' dias'}
                  </p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Validade do Relatório</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {VALIDITY_OPTIONS.find(v => v.value === validityDays)?.label || validityDays + ' dias'} a partir da emissão
                  </p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Forma de Pagamento</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    {PAYMENT_OPTIONS.find(p => p.value === paymentMethod)?.label || paymentMethod}
                  </p>
                </div>
              </div>
            </Section>

            {/* Signature */}
            <hr className="border-border" />
            <div className="text-center py-6">
              <div className="inline-block border-b-2 border-foreground pb-1 px-12 mb-2">
                <p className="font-display text-lg italic">{report.technicianSignature}</p>
              </div>
              <p className="text-xs text-muted-foreground">Técnico Responsável</p>
              <p className="text-xs text-muted-foreground mt-1">
                Relatório gerado em {format(report.completedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Faz-Tudo Imobiliário — Relatório Final — {order.osNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este documento é gerado automaticamente e tem validade como comprovante de serviço.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display font-semibold text-base mb-3 text-foreground">{title}</h3>
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

export default RelatorioOS;
