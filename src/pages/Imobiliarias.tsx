import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Building2, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Imobiliaria {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  cnpj: string | null;
  created_at: string;
}

const Imobiliarias = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImobiliarias = async () => {
      setIsLoading(true);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'imobiliaria');

      if (roles && roles.length > 0) {
        const userIds = roles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        setImobiliarias((profiles as Imobiliaria[]) || []);
      } else {
        setImobiliarias([]);
      }
      setIsLoading(false);
    };

    fetchImobiliarias();
  }, []);

  const filtered = imobiliarias.filter(i => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      i.name.toLowerCase().includes(term) ||
      i.email.toLowerCase().includes(term) ||
      (i.company?.toLowerCase().includes(term) ?? false)
    );
  });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Imobiliárias</h1>
        <p className="text-muted-foreground mt-1">
          {imobiliarias.length} imobiliária{imobiliarias.length !== 1 ? 's' : ''} cadastrada{imobiliarias.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar imobiliárias..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((imob) => (
            <Card key={imob.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {imob.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {imob.company && <p className="text-muted-foreground">{imob.company}</p>}
                {imob.cnpj && <p className="text-muted-foreground">CNPJ: {imob.cnpj}</p>}
                <p className="text-muted-foreground">{imob.email}</p>
                {imob.phone && <p className="text-muted-foreground">{imob.phone}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma imobiliária encontrada</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Imobiliarias;
