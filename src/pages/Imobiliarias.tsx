import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Building2, Search, Loader2, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Cliente {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  cnpj: string | null;
  created_at: string;
  role: 'imobiliaria' | 'pessoa_fisica';
}

const Imobiliarias = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'imobiliaria' | 'pessoa_fisica'>('todos');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClientes = async () => {
      setIsLoading(true);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['imobiliaria', 'pessoa_fisica']);

      if (roles && roles.length > 0) {
        const userIds = Array.from(new Set(roles.map((r: any) => r.user_id as string)));
        const roleByUser: Record<string, 'imobiliaria' | 'pessoa_fisica'> = {};
        for (const r of roles as any[]) {
          // imobiliaria tem prioridade se o usuário tiver os dois papéis
          if (!roleByUser[r.user_id] || r.role === 'imobiliaria') {
            roleByUser[r.user_id] = r.role;
          }
        }

        // Filtrar banidos em paralelo
        const bannedFlags = await Promise.all(
          userIds.map(async (id) => {
            const { data } = await supabase.rpc('is_user_banned', { _user_id: id });
            return [id, !!data] as const;
          })
        );
        const activeIds = bannedFlags.filter(([, banned]) => !banned).map(([id]) => id);

        if (activeIds.length === 0) {
          setClientes([]);
        } else {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', activeIds);
          setClientes(
            (profiles || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              email: p.email,
              phone: p.phone,
              company: p.company,
              cnpj: p.cnpj,
              created_at: p.created_at,
              role: roleByUser[p.id] || 'imobiliaria',
            }))
          );
        }
      } else {
        setClientes([]);
      }
      setIsLoading(false);
    };

    fetchClientes();
  }, []);

  const filtered = clientes.filter(i => {
    if (tipoFiltro !== 'todos' && i.role !== tipoFiltro) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      i.name.toLowerCase().includes(term) ||
      i.email.toLowerCase().includes(term) ||
      (i.company?.toLowerCase().includes(term) ?? false) ||
      (i.cnpj?.toLowerCase().includes(term) ?? false)
    );
  });

  const totalImob = clientes.filter(c => c.role === 'imobiliaria').length;
  const totalPF = clientes.filter(c => c.role === 'pessoa_fisica').length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground mt-1">
          {totalImob} imobiliária{totalImob !== 1 ? 's' : ''} · {totalPF} pessoa{totalPF !== 1 ? 's' : ''} física{totalPF !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, e-mail, CNPJ/CPF…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={tipoFiltro === 'todos' ? 'default' : 'outline'} onClick={() => setTipoFiltro('todos')}>Todos</Button>
          <Button size="sm" variant={tipoFiltro === 'imobiliaria' ? 'default' : 'outline'} onClick={() => setTipoFiltro('imobiliaria')}>Imobiliárias</Button>
          <Button size="sm" variant={tipoFiltro === 'pessoa_fisica' ? 'default' : 'outline'} onClick={() => setTipoFiltro('pessoa_fisica')}>Pessoas Físicas</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {c.role === 'imobiliaria' ? (
                      <Building2 className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                    {c.name}
                  </CardTitle>
                  <Badge variant={c.role === 'imobiliaria' ? 'default' : 'secondary'}>
                    {c.role === 'imobiliaria' ? 'Imobiliária' : 'Pessoa Física'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {c.company && <p className="text-muted-foreground">{c.company}</p>}
                {c.cnpj && (
                  <p className="text-muted-foreground">
                    {c.role === 'imobiliaria' ? 'CNPJ' : 'CPF'}: {c.cnpj}
                  </p>
                )}
                <p className="text-muted-foreground">{c.email}</p>
                {c.phone && <p className="text-muted-foreground">{c.phone}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum cliente encontrado</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Imobiliarias;
