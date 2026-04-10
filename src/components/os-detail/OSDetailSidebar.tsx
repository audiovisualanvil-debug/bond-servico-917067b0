import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPhone } from '@/components/ui/phone-input';
import { MapPin, Building2, User, Wrench, Calendar, Phone, Mail } from 'lucide-react';
import { ServiceOrder } from '@/types/serviceOrder';

interface Props {
  order: ServiceOrder;
  role: string;
}

export function OSDetailSidebar({ order, role }: Props) {
  const showContacts = role === 'admin' || role === 'tecnico';

  return (
    <div className="space-y-6">
      <div className="os-card">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Imóvel</h3>
        </div>
        <p className="text-sm text-foreground">{order.property.address}</p>
        <p className="text-sm text-muted-foreground">{order.property.neighborhood}, {order.property.city}</p>

        {/* Contatos do imóvel - visíveis para Admin e Técnico */}
        {showContacts && (
          <>
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
            {order.property.ownerName && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Proprietário</p>
                <p className="text-sm text-foreground">{order.property.ownerName}</p>
                {order.property.ownerPhone && (
                  <a href={`tel:${order.property.ownerPhone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-1">
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(order.property.ownerPhone)}
                  </a>
                )}
                {order.property.ownerEmail && (
                  <a href={`mailto:${order.property.ownerEmail}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-1">
                    <Mail className="h-3.5 w-3.5" />
                    {order.property.ownerEmail}
                  </a>
                )}
              </div>
            )}
            {!order.property.tenantName && !order.property.ownerName && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground italic">Nenhum contato cadastrado para este imóvel.</p>
              </div>
            )}
          </>
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
            <h3 className="font-semibold">Profissional Responsável</h3>
          </div>
          <p className="text-sm text-foreground">{order.tecnico.name}</p>
          <p className="text-sm text-muted-foreground">{order.tecnico.phone}</p>
        </div>
      )}

      <div className="os-card">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Histórico</h3>
        </div>
        <div className="space-y-3 text-sm">
          <TimelineItem label="Chamado aberto" date={order.createdAt} color="bg-primary" />
          {order.quoteSentAt && <TimelineItem label="Orçamento enviado" date={order.quoteSentAt} color="bg-status-pending" />}
          {order.adminApprovedAt && <TimelineItem label="Aprovado pelo admin" date={order.adminApprovedAt} color="bg-status-in-progress" />}
          {order.clientApprovedAt && <TimelineItem label="Aprovado pelo cliente" date={order.clientApprovedAt} color="bg-status-approved" />}
          {order.completedAt && <TimelineItem label="Serviço concluído" date={order.completedAt} color="bg-status-completed" />}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, date, color }: { label: string; date: Date; color: string }) {
  return (
    <div className="flex gap-3">
      <div className={`w-2 h-2 rounded-full ${color} mt-1.5`} />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
      </div>
    </div>
  );
}
