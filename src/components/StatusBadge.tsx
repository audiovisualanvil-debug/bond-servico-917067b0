import { OSStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/serviceOrder';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: OSStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return (
    <span className={cn('status-badge', STATUS_COLORS[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  );
};
