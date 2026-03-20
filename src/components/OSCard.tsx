import { ServiceOrder } from '@/types/serviceOrder';
import { StatusBadge } from '@/components/StatusBadge';
import { UrgencyIndicator } from '@/components/UrgencyIndicator';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Calendar, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface OSCardProps {
  order: ServiceOrder;
  showActions?: boolean;
}

export const OSCard: React.FC<OSCardProps> = ({ order, showActions = true }) => {
  const { role } = useAuth();

  return (
    <div className="os-card animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="font-display font-bold text-primary">
              {order.osNumber}
            </span>
            <StatusBadge status={order.status} />
            <UrgencyIndicator urgency={order.urgency} />
          </div>

          {/* Problem description */}
          <p className="text-foreground font-medium line-clamp-2 mb-3">
            {order.problem}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{order.property.address}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>{order.requesterName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDistanceToNow(order.createdAt, { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Pricing info - tecnico only sees cost, admin sees both */}
          {role === 'tecnico' && order.technicianCost && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Custo profissional: <strong className="text-foreground">R$ {order.technicianCost.toFixed(2)}</strong>
              </span>
            </div>
          )}
          {role === 'admin' && order.technicianCost && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Custo técnico: <strong className="text-foreground">R$ {order.technicianCost.toFixed(2)}</strong>
              </span>
              {order.finalPrice && (
                <span className="text-muted-foreground">
                  Valor final: <strong className="text-primary">R$ {order.finalPrice.toFixed(2)}</strong>
                </span>
              )}
            </div>
          )}

          {/* Imobiliaria only sees final price */}
          {role === 'imobiliaria' && order.finalPrice && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Valor do serviço: <strong className="text-primary">R$ {order.finalPrice.toFixed(2)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex-shrink-0">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/ordens/${order.id}`}>
                Ver detalhes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
