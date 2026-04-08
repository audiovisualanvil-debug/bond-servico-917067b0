import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Wrench, DollarSign, Clock, CheckCircle2, ExternalLink, Mail, Loader2 } from 'lucide-react';
import { ServiceOrder } from '@/types/serviceOrder';

interface Props {
  order: ServiceOrder;
  role: string;
  sendingReportTo: string | null;
  onSendReport: (sendTo: ('imobiliaria' | 'tecnico' | 'proprietario')[]) => void;
}

export function OSProblemSection({ order }: { order: ServiceOrder }) {
  return (
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
  );
}

export function OSDiagnosticSection({ order, role }: { order: ServiceOrder; role: string }) {
  if (!order.technicianDescription) return null;
  return (
    <div className="os-card">
      <div className="flex items-center gap-2 mb-3">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">Diagnóstico do Profissional</h2>
      </div>
      <p className="text-foreground mb-4">{order.technicianDescription}</p>
      <div className="flex gap-4">
        {(role === 'admin' || role === 'tecnico') && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            {role === 'admin' ? 'Custo' : 'Custo informado'}: R$ {order.technicianCost?.toFixed(2)}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Prazo: {order.estimatedDeadline} {order.estimatedDeadline === 1 ? 'dia' : 'dias'}
        </div>
      </div>
    </div>
  );
}

export function OSCompletionSection({ order, role, sendingReportTo, onSendReport }: Props) {
  if (!order.completionReport) return null;
  const report = order.completionReport;

  return (
    <div className="os-card border-2 border-status-completed/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-status-completed" />
          <h2 className="font-display font-semibold text-lg">Relatório de Conclusão</h2>
        </div>
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <>
              <ReportSendButton label="Imobiliária" target="imobiliaria" sendingReportTo={sendingReportTo} onSendReport={onSendReport} />
              <ReportSendButton label="Profissional" target="tecnico" sendingReportTo={sendingReportTo} onSendReport={onSendReport} />
              {order.property.ownerEmail ? (
                <ReportSendButton label="Proprietário" target="proprietario" sendingReportTo={sendingReportTo} onSendReport={onSendReport} />
              ) : (
                <Button variant="outline" size="sm" disabled title="Cadastre o e-mail do proprietário no imóvel">
                  <Mail className="h-3.5 w-3.5" /> Proprietário (sem e-mail)
                </Button>
              )}
            </>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/ordens/${order.id}/relatorio`}>
              <ExternalLink className="h-3.5 w-3.5" /> Ver Relatório Completo
            </Link>
          </Button>
        </div>
      </div>
      <p className="text-foreground mb-4">{report.description}</p>

      {((report.photosBefore?.length > 0) || (report.photosAfter?.length > 0)) && (
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <PhotoStrip label="Antes" photos={report.photosBefore} />
          <PhotoStrip label="Depois" photos={report.photosAfter} />
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm font-medium mb-2">Checklist:</p>
        <div className="space-y-1">
          {report.checklist.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className={`h-4 w-4 ${item.completed ? 'text-status-completed' : 'text-muted-foreground'}`} />
              <span className={item.completed ? '' : 'text-muted-foreground line-through'}>{item.item}</span>
            </div>
          ))}
        </div>
      </div>

      {report.observations && (
        <div className="p-3 bg-secondary/50 rounded-lg">
          <p className="text-sm font-medium mb-1">Observações:</p>
          <p className="text-sm text-muted-foreground">{report.observations}</p>
        </div>
      )}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
        <span>Profissional: {report.technicianSignature}</span>
        <span>{format(report.completedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
      </div>
    </div>
  );
}

function ReportSendButton({ label, target, sendingReportTo, onSendReport }: {
  label: string; target: 'imobiliaria' | 'tecnico' | 'proprietario';
  sendingReportTo: string | null; onSendReport: (t: ('imobiliaria' | 'tecnico' | 'proprietario')[]) => void;
}) {
  const isSending = sendingReportTo === target;
  return (
    <Button variant="outline" size="sm" onClick={() => onSendReport([target])} disabled={!!sendingReportTo}>
      {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
      Enviar p/ {label}
    </Button>
  );
}

function PhotoStrip({ label, photos }: { label: string; photos?: string[] }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label} ({photos.length} fotos)</p>
      <div className="flex gap-1">
        {photos.slice(0, 3).map((url, i) => (
          <div key={i} className="w-16 h-12 rounded-md overflow-hidden border border-border">
            <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
        {photos.length > 3 && (
          <div className="w-16 h-12 rounded-md bg-secondary flex items-center justify-center text-xs text-muted-foreground">
            +{photos.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}
