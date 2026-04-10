import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusBadge } from '@/components/StatusBadge';
import { UrgencyIndicator } from '@/components/UrgencyIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, FileDown, FileText, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ServiceOrder } from '@/types/serviceOrder';

interface Props {
  order: ServiceOrder;
  role: string;
  isDeleting: boolean;
  onDelete: () => void;
}

export function OSDetailHeader({ order, role, isDeleting, onDelete }: Props) {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const isConcluded = order.status === 'concluido';
  const canConfirmDelete = !isConcluded || confirmText === order.osNumber;

  return (
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
          {order.completionReport && (role === 'admin' || role === 'imobiliaria') && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/ordens/${order.id}/relatorio`}>
                <FileText className="h-3.5 w-3.5" />
                Relatório PDF
              </Link>
            </Button>
          )}
          {role === 'admin' && (
            <AlertDialog onOpenChange={(open) => { if (!open) setConfirmText(''); }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir Ordem de Serviço</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        Tem certeza que deseja excluir a OS <strong>{order.osNumber}</strong>? Esta ação não pode ser desfeita.
                      </p>
                      {isConcluded && (
                        <div className="space-y-2">
                          <p className="text-destructive font-medium">
                            ⚠️ Esta OS já foi concluída. Para confirmar, digite o número da OS abaixo:
                          </p>
                          <Input
                            placeholder={order.osNumber || 'Número da OS'}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    disabled={!canConfirmDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
  );
}
