import { UrgencyLevel, URGENCY_LABELS, URGENCY_COLORS } from '@/types/serviceOrder';
import { cn } from '@/lib/utils';

interface UrgencyIndicatorProps {
  urgency: UrgencyLevel;
  showLabel?: boolean;
  className?: string;
}

export const UrgencyIndicator: React.FC<UrgencyIndicatorProps> = ({ 
  urgency, 
  showLabel = true,
  className 
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn('urgency-indicator', URGENCY_COLORS[urgency])} />
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {URGENCY_LABELS[urgency]}
        </span>
      )}
    </div>
  );
};
