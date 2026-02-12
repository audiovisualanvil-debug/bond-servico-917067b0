import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatPhone } from '@/components/ui/phone-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, MapPin, History, CheckCircle2, Clock, ChevronRight, Building2, Loader2, FileText
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useProperties } from '@/hooks/useProperties';
import { useServiceOrders } from '@/hooks/useServiceOrders';
import { StatusBadge } from '@/components/StatusBadge';

const HistoricoImoveis = () => {
  const { user, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: allOrders = [], isLoading: ordersLoading } = useServiceOrders();

  if (!user || !role) return null;

  const filteredProperties = properties.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.address.toLowerCase().includes(term) ||
      p.neighborhood.toLowerCase().includes(term) ||
      p.city.toLowerCase().includes(term)
    );
  });

  const propertyOrders = selectedPropertyId
    ? allOrders
        .filter(os => os.propertyId === selectedPropertyId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    : [];

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const getPropertyStats = (propertyId: string) => {
    const orders = allOrders.filter(os => os.propertyId === propertyId);
    return {
      total: orders.length,
      completed: orders.filter(os => os.status === 'concluido').length,
      pending: orders.filter(os => os.status !== 'concluido').length,
    };
  };

  const isLoading = propertiesLoading || ordersLoading;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Histórico por Imóvel</h1>
          <p className="text-muted-foreground mt-1">Visualize todo o histórico de manutenções de cada imóvel</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="os-card h-full">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold">Imóveis</h2>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar imóvel..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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
                        isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{property.address}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{property.neighborhood}, {property.city}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {stats.total > 0 && <span className="text-xs text-muted-foreground">{stats.total} OS</span>}
                          <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredProperties.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum imóvel encontrado</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedProperty ? (
              <div className="space-y-6">
                <div className="os-card">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-display font-bold text-xl text-foreground">{selectedProperty.address}</h2>
                      <p className="text-muted-foreground">{selectedProperty.neighborhood}, {selectedProperty.city} - {selectedProperty.state}</p>
                      {selectedProperty.zipCode && <p className="text-sm text-muted-foreground mt-1">CEP: {selectedProperty.zipCode}</p>}
                      {(selectedProperty.tenantName || selectedProperty.ownerName) && (
                        <div className="mt-2 space-y-1">
                          {selectedProperty.tenantName && (
                            <p className="text-sm text-muted-foreground">
                              Inquilino: {selectedProperty.tenantName}
                              {selectedProperty.tenantPhone && ` • ${formatPhone(selectedProperty.tenantPhone)}`}
                            </p>
                          )}
                          {selectedProperty.ownerName && (
                            <p className="text-sm text-muted-foreground">
                              Proprietário: {selectedProperty.ownerName}
                              {selectedProperty.ownerPhone && ` • ${formatPhone(selectedProperty.ownerPhone)}`}
                              {selectedProperty.ownerEmail && ` • ${selectedProperty.ownerEmail}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-3 bg-secondary rounded-lg">
                      <p className="text-2xl font-bold text-foreground">{getPropertyStats(selectedProperty.id).total}</p>
                      <p className="text-xs text-muted-foreground">Total de OS</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10">
                      <p className="text-2xl font-bold text-green-600">{getPropertyStats(selectedProperty.id).completed}</p>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                      <p className="text-2xl font-bold text-yellow-600">{getPropertyStats(selectedProperty.id).pending}</p>
                      <p className="text-xs text-muted-foreground">Em Andamento</p>
                    </div>
                  </div>
                </div>

                <div className="os-card">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold">Histórico de Serviços</h3>
                  </div>

                  {propertyOrders.length > 0 ? (
                    <div className="space-y-4">
                      {propertyOrders.map((order, index) => (
                        <div key={order.id} className="relative pl-6 pb-4 last:pb-0">
                          {index < propertyOrders.length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
                          )}
                          <div className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center ${
                            order.status === 'concluido' ? 'bg-green-500/10' : 'bg-yellow-500/10'
                          }`}>
                            {order.status === 'concluido' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-primary">{order.osNumber}</span>
                              <StatusBadge status={order.status} />
                            </div>
                            <p className="text-sm text-foreground">{order.problem}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.createdAt.toLocaleDateString('pt-BR')}
                              {order.finalPrice && role !== 'tecnico' && ` • R$ ${order.finalPrice.toFixed(2)}`}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button variant="link" className="p-0 h-auto text-xs" asChild>
                                <Link to={`/ordens/${order.id}`}>Ver detalhes →</Link>
                              </Button>
                              {order.status === 'concluido' && order.completionReport && (
                                <Button variant="link" className="p-0 h-auto text-xs text-status-completed" asChild>
                                  <Link to={`/ordens/${order.id}/relatorio`}>
                                    <FileText className="h-3 w-3" /> Relatório
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum serviço registrado para este imóvel</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="os-card h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Selecione um imóvel para ver o histórico</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default HistoricoImoveis;
