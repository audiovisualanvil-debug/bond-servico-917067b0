import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
}

export function useTechnicians() {
  const { role } = useAuth();

  return useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      // Get all user_ids with tecnico role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'tecnico');

      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) return [];

      const techIds = roleData.map(r => r.user_id);

      // Filter out banned users
      const activeTechIds: string[] = [];
      for (const id of techIds) {
        const { data: isBanned } = await supabase.rpc('is_user_banned', { _user_id: id });
        if (!isBanned) activeTechIds.push(id);
      }

      if (activeTechIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, company')
        .in('id', activeTechIds)
        .order('name');

      if (profileError) throw profileError;
      return (profiles || []) as Technician[];
    },
    enabled: role === 'admin',
  });
}
