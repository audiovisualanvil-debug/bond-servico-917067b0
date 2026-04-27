import { Building2, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { typedFrom } from '@/integrations/supabase/helpers';

interface RequesterBadgeProps {
  imobiliariaId?: string;
  size?: 'sm' | 'md';
}

/**
 * Shows a colored badge indicating whether the requester of an OS
 * is an "Imobiliária" (blue) or a "Pessoa Física" (green).
 * Looks up the role via user_roles table (cached).
 */
export const RequesterBadge: React.FC<RequesterBadgeProps> = ({ imobiliariaId, size = 'sm' }) => {
  const { data: requesterRole } = useQuery({
    queryKey: ['requester-role', imobiliariaId],
    queryFn: async () => {
      if (!imobiliariaId) return null;
      const { data } = await typedFrom('user_roles')
        .select('role')
        .eq('user_id', imobiliariaId);
      const roles = (data || []).map((r: any) => r.role);
      if (roles.includes('pessoa_fisica')) return 'pessoa_fisica';
      if (roles.includes('imobiliaria')) return 'imobiliaria';
      return null;
    },
    enabled: !!imobiliariaId,
    staleTime: 1000 * 60 * 30, // 30min — roles rarely change
  });

  if (!requesterRole) return null;

  const isPF = requesterRole === 'pessoa_fisica';
  const Icon = isPF ? User : Building2;
  const label = isPF ? 'Pessoa Física' : 'Imobiliária';
  const colorClasses = isPF
    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400'
    : 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400';

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${colorClasses} ${sizeClasses}`}
      title={`Solicitante: ${label}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};
