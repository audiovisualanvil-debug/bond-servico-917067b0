import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: 'default' | 'primary' | 'accent';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  className,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-card border-border',
    primary: 'bg-gradient-primary border-primary/20 text-primary-foreground',
    accent: 'bg-gradient-accent border-accent/20 text-accent-foreground',
  };

  const iconBgStyles = {
    default: 'bg-primary/10 text-primary',
    primary: 'bg-primary-foreground/20 text-primary-foreground',
    accent: 'bg-accent-foreground/20 text-accent-foreground',
  };

  return (
    <div className={cn('stat-card border', variantStyles[variant], className)}>
      {/* FIX: Erro #1/#4/#11 - Valores monetários e títulos nunca truncados */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 overflow-visible">
          <p className={cn(
            'text-sm font-medium',
            variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
          )}>
            {title}
          </p>
          <p className="mt-2 text-lg sm:text-xl lg:text-2xl font-bold font-display whitespace-nowrap">{value}</p>
          {trend && (
            <p className={cn(
              'mt-1 text-xs font-medium',
              trend.isPositive ? 'text-status-approved' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% este mês
            </p>
          )}
        </div>
        <div className={cn('rounded-xl p-3 shrink-0', iconBgStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};
