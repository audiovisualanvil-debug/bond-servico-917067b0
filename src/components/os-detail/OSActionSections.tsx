import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Send, Wrench, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { ServiceOrder } from '@/types/serviceOrder';

interface TechOption {
  id: string;
  name: string;
  company?: string | null;
}

interface TechQuote {
  description: string;
  laborCost: number;
  materialCost: number;
  taxCost: number;
  deadline: number;
}

// ---------- TECHNICIAN ACTIONS ----------

interface TechQuoteFormProps {
  techQuote: TechQuote;
  setTechQuote: React.Dispatch<React.SetStateAction<TechQuote>>;
  onSubmit: () => void;
  isMutating: boolean;
}

export function TechQuoteForm({ techQuote, setTechQuote, onSubmit, isMutating }: TechQuoteFormProps) {
  const total = techQuote.laborCost + techQuote.materialCost + techQuote.taxCost;
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
          <div><Label>Mão de Obra (R$)</Label><Input type="number" placeholder="0.00" value={techQuote.laborCost || ''} onChange={(e) => setTechQuote(prev => ({ ...prev, laborCost: parseFloat(e.target.value) || 0 }))} /></div>
          <div><Label>Materiais (R$)</Label><Input type="number" placeholder="0.00" value={techQuote.materialCost || ''} onChange={(e) => setTechQuote(prev => ({ ...prev, materialCost: parseFloat(e.target.value) || 0 }))} /></div>
          <div><Label>Impostos (R$)</Label><Input type="number" placeholder="0.00" value={techQuote.taxCost || ''} onChange={(e) => setTechQuote(prev => ({ ...prev, taxCost: parseFloat(e.target.value) || 0 }))} /></div>
        </div>
        {total > 0 && (
          <div className="p-3 bg-secondary/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-foreground">R$ {total.toFixed(2)}</span>
          </div>
        )}
        <div><Label>Prazo (dias)</Label><Input type="number" placeholder="1" value={techQuote.deadline} onChange={(e) => setTechQuote(prev => ({ ...prev, deadline: parseInt(e.target.value) || 1 }))} /></div>
        <Button onClick={onSubmit} className="w-full" disabled={isMutating}>
          {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar Orçamento
        </Button>
      </div>
    </div>
  );
}

export function StartExecutionButton({ onStart, isMutating }: { onStart: () => void; isMutating: boolean }) {
  return (
    <div className="os-card">
      <Button onClick={onStart} variant="default" className="w-full" size="lg" disabled={isMutating}>
        {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
        Iniciar Execução
      </Button>
    </div>
  );
}

// ---------- ADMIN ACTIONS ----------

interface AssignTechProps {
  technicians: TechOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAssign: () => void;
  isMutating: boolean;
}

export function AssignTechSection({ technicians, selectedId, onSelect, onAssign, isMutating }: AssignTechProps) {
  return (
    <div className="os-card border-2 border-primary/30">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">Designar Profissional</h2>
      </div>
      <div className="space-y-4">
        <div>
          <Label>Selecionar profissional</Label>
          <Select value={selectedId} onValueChange={onSelect}>
            <SelectTrigger><SelectValue placeholder="Escolha um profissional..." /></SelectTrigger>
            <SelectContent>
              {technicians.map(tech => (
                <SelectItem key={tech.id} value={tech.id}>{tech.name} {tech.company ? `(${tech.company})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onAssign} className="w-full" disabled={isMutating || !selectedId}>
          {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Designar Profissional
        </Button>
      </div>
    </div>
  );
}

export function AssignedTechInfo({ name }: { name: string }) {
  return (
    <div className="os-card border-2 border-primary/30">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">Profissional Designado</h2>
      </div>
      <div className="p-4 bg-primary/5 rounded-lg">
        <p className="text-sm text-muted-foreground">Profissional designado</p>
        <p className="text-lg font-semibold text-foreground">{name}</p>
        <p className="text-sm text-muted-foreground">Aguardando envio do orçamento pelo profissional</p>
      </div>
    </div>
  );
}

interface AdminPricingProps {
  order: ServiceOrder;
  finalPrice: number;
  setFinalPrice: (v: number) => void;
  onApprove: () => void;
  onPaymentChange: (value: string) => void;
  isMutating: boolean;
}

export function AdminPricingSection({ order, finalPrice, setFinalPrice, onApprove, onPaymentChange, isMutating }: AdminPricingProps) {
  return (
    <div className="os-card border-2 border-accent/30">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-accent" />
        <h2 className="font-display font-semibold text-lg">Revisar Valor Final</h2>
      </div>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {order.laborCost != null && order.laborCost > 0 && <CostCard label="Mão de Obra" value={order.laborCost} />}
          {order.materialCost != null && order.materialCost > 0 && <CostCard label="Materiais" value={order.materialCost} />}
          {order.taxCost != null && order.taxCost > 0 && <CostCard label="Impostos" value={order.taxCost} />}
        </div>
        <div className="p-4 bg-secondary/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Custo Total do Profissional</p>
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
          <Select value={order.paymentMethod || ''} onValueChange={onPaymentChange}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="imobiliaria">Pgto via Imobiliária</SelectItem>
              <SelectItem value="pix">Pgto PIX</SelectItem>
              <SelectItem value="cartao">Pgto Cartão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onApprove} className="w-full" size="lg" disabled={isMutating}>
          {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Aprovar e Enviar Orçamento
        </Button>
      </div>
    </div>
  );
}

// ---------- IMOBILIARIA ACTIONS ----------

interface ClientApproveProps {
  order: ServiceOrder;
  onApprove: () => void;
  onRevision: () => void;
  isMutating: boolean;
}

export function ClientApproveSection({ order, onApprove, onRevision, isMutating }: ClientApproveProps) {
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
          <Button variant="outline" className="flex-1" onClick={onRevision} disabled={isMutating}>Solicitar Revisão</Button>
          <Button onClick={onApprove} variant="default" className="flex-1" disabled={isMutating}>
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aprovar Serviço
          </Button>
        </div>
      </div>
    </div>
  );
}

function CostCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 bg-secondary/50 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">R$ {value.toFixed(2)}</p>
    </div>
  );
}
