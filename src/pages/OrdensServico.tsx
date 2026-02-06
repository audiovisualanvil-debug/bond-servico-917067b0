import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { OSCard } from '@/components/OSCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Search, Plus, Filter, ClipboardList } from 'lucide-react';
import { mockServiceOrders } from '@/data/mockData';
import { OSStatus, STATUS_LABELS } from '@/types/serviceOrder';

const OrdensServico = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'all'>('all');

  if (!user) return null;

  // Filter orders based on user role
  const getFilteredOrders = () => {
    let orders = mockServiceOrders;

    // Role-based filtering
    switch (user.role) {
      case 'imobiliaria':
        orders = orders.filter(os => os.imobiliariaId === user.id);
        break;
      case 'tecnico':
        orders = orders.filter(os => 
          os.tecnicoId === user.id || 
          (os.status === 'aguardando_orcamento' && !os.tecnicoId)
        );
        break;
      // Admin sees all
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      orders = orders.filter(os =>
        os.osNumber.toLowerCase().includes(term) ||
        os.problem.toLowerCase().includes(term) ||
        os.property.address.toLowerCase().includes(term) ||
        os.requesterName.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      orders = orders.filter(os => os.status === statusFilter);
    }

    return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  const filteredOrders = getFilteredOrders();

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Ordens de Serviço
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'ordem encontrada' : 'ordens encontradas'}
          </p>
        </div>
        {user.role === 'imobiliaria' && (
          <Button size="lg" asChild>
            <Link to="/novo-chamado">
              <Plus className="h-5 w-5" />
              Novo Chamado
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, endereço, problema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OSStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <div className="space-y-4 stagger-children">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OSCard key={order.id} order={order} />
          ))
        ) : (
          <div className="os-card text-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              Nenhuma ordem de serviço encontrada
            </p>
            <p className="text-sm text-muted-foreground">
              Tente ajustar os filtros de busca
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrdensServico;
