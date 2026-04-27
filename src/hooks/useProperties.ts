import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { typedFrom } from '@/integrations/supabase/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { Property } from '@/types/serviceOrder';

interface DbProperty {
  id: string;
  imobiliaria_id: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string | null;
  code: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
}

function mapProperty(db: DbProperty): Property {
  return {
    id: db.id,
    address: db.address,
    neighborhood: db.neighborhood,
    city: db.city,
    state: db.state,
    zipCode: db.zip_code || '',
    imobiliariaId: db.imobiliaria_id,
    code: db.code || undefined,
    tenantName: db.tenant_name || undefined,
    tenantPhone: db.tenant_phone || undefined,
    ownerName: db.owner_name || undefined,
    ownerPhone: db.owner_phone || undefined,
    ownerEmail: db.owner_email || undefined,
  };
}

export function useProperties() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['properties', user?.id, role],
    queryFn: async () => {
      if (!user || !role) return [];

      let query = typedFrom('properties').select('*');

      if (role === 'imobiliaria' || role === 'pessoa_fisica') {
        query = query.eq('imobiliaria_id', user.id);
      }
      // Admin sees all, tecnico handled by RLS

      query = query.order('address');

      const { data, error } = await query;
      if (error) throw error;
      return (data as DbProperty[]).map(mapProperty);
    },
    enabled: !!user && !!role,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      imobiliaria_id: string;
      address: string;
      neighborhood: string;
      city: string;
      state: string;
      zip_code?: string;
      code?: string;
      tenant_name?: string;
      tenant_phone?: string;
      owner_name?: string;
      owner_phone?: string;
      owner_email?: string;
    }) => {
      const { data: result, error } = await typedFrom('properties')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      if (!result) throw new Error('Falha ao cadastrar imóvel. Tente novamente.');
      return result as DbProperty;
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}
