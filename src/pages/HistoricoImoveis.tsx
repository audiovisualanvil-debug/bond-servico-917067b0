import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockProperties, mockServiceOrders } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  MapPin, 
  History, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Building2
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const HistoricoImoveis = () => {
  const { user, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  if (!user || !role) return null;

  // Filter properties based on user role
  const userProperties = role === 'admin'
    ? mockProperties
    : mockProperties.filter(p => p.imobiliariaId === user.id);

  const filteredProperties = userProperties.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.address.toLowerCase().includes(term) ||
      p.neighborhood.toLowerCase().includes(term) ||
      p.city.toLowerCase().includes(term)
    );
  });

  // Get orders for selected property
  const propertyOrders = selectedPropertyId
    ? mockServiceOrders
        .filter(os => os.propertyId === selectedPropertyId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    : [];

  const selectedProperty = mockProperties.find(p => p.id === selectedPropertyId);

  const getPropertyStats = (propertyId: string) => {
    const orders = mockServiceOrders.filter(os => os.propertyId === propertyId);
    return {
      total: orders.length,
      completed: orders.filter(os => os.status === 'concluido').length,
      pending: orders.filter(os => os.status !== 'concluido').length,
    };
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Histórico por Imóvel
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize todo o histórico de manutenções de cada imóvel
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Properties List */}
        <div className="lg:col-span-1">
          <div className="os-card h-full">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold">Imóveis</h2>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar imóvel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredProperties.map((property) => {
                const stats = getPropertyStats(property.id);
                const isSelected = selectedPropertyId === property.id;

                return (
                  <button
                    key={property.id}
                    onClick={() => setSelectedPropertyId(property.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {property.address}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {property.neighborhood}, {property.city}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {stats.total > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {stats.total} OS
                          </span>
                        )}
                        <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredProperties.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum imóvel encontrado
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Property History */}
        <div className="lg:col-span-2">
          {selectedProperty ? (
            <div className="space-y-6">
              {/* Property Header */}
              <div className="os-card">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display font-bold text-xl text-foreground">
                      {selectedProperty.address}
                    </h2>
                    <p className="text-muted-foreground">
                      {selectedProperty.neighborhood}, {selectedProperty.city} - {selectedProperty.state}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      CEP: {selectedProperty.zipCode}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-3 bg-secondary rounded-lg">
                    <p className="text-2xl font-bold text-foreground">
                      {getPropertyStats(selectedProperty.id).total}
                    </p>
                    <p className="text-xs text-muted-foreground">Total de OS</p>
                  </div>
                  <div className="text-center p-3 bg-status-completed-bg rounded-lg">
                    <p className="text-2xl font-bold text-status-completed">
                      {getPropertyStats(selectedProperty.id).completed}
                    </p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                  <div className="text-center p-3 bg-status-pending-bg rounded-lg">
                    <p className="text-2xl font-bold text-status-pending">
                      {getPropertyStats(selectedProperty.id).pending}
                    </p>
                    <p className="text-xs text-muted-foreground">Em Andamento</p>
                  </div>
                </div>
              </div>

              {/* Orders Timeline */}
              <div className="os-card">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold">Histórico de Serviços</h3>
                </div>

                {propertyOrders.length > 0 ? (
                  <div className="space-y-4">
                    {propertyOrders.map((order, index) => (
                      <div
                        key={order.id}
                        className="relative pl-6 pb-4 last:pb-0"
                      >
                        {/* Timeline line */}
                        {index < propertyOrders.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
                        )}
                        
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center ${
                          order.status === 'concluido'
                            ? 'bg-status-completed-bg'
                            : 'bg-status-pending-bg'
                        }`}>
                          {order.status === 'concluido' ? (
                            <CheckCircle2 className="h-4 w-4 text-status-completed" />
                          ) : (
                            <Clock className="h-4 w-4 text-status-pending" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="ml-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-primary">{order.osNumber}</span>
                            <span className={`status-badge ${order.status === 'concluido' ? 'status-completed' : 'status-pending'}`}>
                              {order.status === 'concluido' ? 'Concluído' : 'Em Andamento'}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{order.problem}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.createdAt.toLocaleDateString('pt-BR')}
                            {order.finalPrice && ` • R$ ${order.finalPrice.toFixed(2)}`}
                          </p>
                          <Button variant="link" className="p-0 h-auto text-xs mt-1" asChild>
                            <Link to={`/ordens/${order.id}`}>Ver detalhes →</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum serviço registrado para este imóvel
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="os-card h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Selecione um imóvel para ver o histórico
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HistoricoImoveis;
