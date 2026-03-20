import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Users, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Tecnico {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  created_at: string;
}

const Tecnicos = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTecnicos = async () => {
      setIsLoading(true);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'tecnico');

      if (roles && roles.length > 0) {
        const userIds = roles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        setTecnicos((profiles as Tecnico[]) || []);
      } else {
        setTecnicos([]);
      }
      setIsLoading(false);
    };

    fetchTecnicos();
  }, []);

  const filtered = tecnicos.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.email.toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Profissionais</h1>
        <p className="text-muted-foreground mt-1">
          {tecnicos.length} profissional{tecnicos.length !== 1 ? 'is' : ''} cadastrado{tecnicos.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar profissionais..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tec) => (
            <Card key={tec.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {tec.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground">{tec.email}</p>
                {tec.phone && <p className="text-muted-foreground">{tec.phone}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum profissional encontrado</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Tecnicos;
