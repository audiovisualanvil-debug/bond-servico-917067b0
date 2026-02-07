import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, MapPin, AlertTriangle, User, Send, ArrowLeft, Loader2 } from 'lucide-react';
import { UrgencyLevel, URGENCY_LABELS } from '@/types/serviceOrder';
import { useProperties, useCreateProperty } from '@/hooks/useProperties';
import { useCreateServiceOrder } from '@/hooks/useServiceOrders';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const NovoChamado = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userProperties = [], isLoading: propertiesLoading } = useProperties();
  const createProperty = useCreateProperty();
  const createOrder = useCreateServiceOrder();

  const [formData, setFormData] = useState({
    propertyId: '',
    newAddress: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '',
    code: '',
    tenantName: '',
    tenantPhone: '',
    ownerName: '',
    ownerPhone: '',
    problem: '',
    urgency: '' as UrgencyLevel | '',
    requesterName: '',
    photos: [] as File[],
  });

  if (!user) return null;

  const isSubmitting = createOrder.isPending || createProperty.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.problem || !formData.urgency || !formData.requesterName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      let propertyId = formData.propertyId;

      // Create new property if needed
      if (propertyId === 'new') {
        if (!formData.newAddress || !formData.neighborhood) {
          toast.error('Preencha o endereço e bairro do novo imóvel');
          return;
        }

        const newProperty = await createProperty.mutateAsync({
          imobiliaria_id: user.id,
          address: formData.newAddress,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode || undefined,
          code: formData.code || undefined,
          tenant_name: formData.tenantName || undefined,
          tenant_phone: formData.tenantPhone || undefined,
          owner_name: formData.ownerName || undefined,
          owner_phone: formData.ownerPhone || undefined,
        });

        propertyId = newProperty.id;
      }

      if (!propertyId || propertyId === 'new') {
        toast.error('Selecione ou cadastre um imóvel');
        return;
      }

      await createOrder.mutateAsync({
        property_id: propertyId,
        imobiliaria_id: user.id,
        problem: formData.problem,
        urgency: formData.urgency,
        requester_name: formData.requesterName,
      });

      toast.success('Chamado aberto com sucesso!', {
        description: 'O técnico será notificado em breve.',
      });

      navigate('/ordens');
    } catch (error: any) {
      toast.error('Erro ao abrir chamado', {
        description: error.message || 'Tente novamente.',
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files].slice(0, 5),
    }));
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Novo Chamado
          </h1>
          <p className="text-muted-foreground mt-1">
            Preencha os dados para abrir uma ordem de serviço
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Property Selection */}
          <div className="os-card">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">Imóvel</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="property">Selecionar imóvel cadastrado</Label>
                <Select 
                  value={formData.propertyId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, propertyId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={propertiesLoading ? 'Carregando...' : 'Escolha um imóvel...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Cadastrar novo imóvel</SelectItem>
                    {userProperties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.address} - {property.neighborhood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.propertyId === 'new' && (
                <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                  <div>
                    <Label htmlFor="code">Código do imóvel</Label>
                    <Input
                      id="code"
                      placeholder="Ex: AP-101, SALA-03"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="newAddress">Endereço completo</Label>
                    <Input
                      id="newAddress"
                      placeholder="Rua, número, complemento"
                      value={formData.newAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, newAddress: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Bairro"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      placeholder="00000-000"
                      value={formData.zipCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tenantName">Inquilino</Label>
                    <Input
                      id="tenantName"
                      placeholder="Nome do inquilino"
                      value={formData.tenantName}
                      onChange={(e) => setFormData(prev => ({ ...prev, tenantName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tenantPhone">Celular do inquilino</Label>
                    <Input
                      id="tenantPhone"
                      placeholder="(11) 99999-9999"
                      value={formData.tenantPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, tenantPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerName">Proprietário</Label>
                    <Input
                      id="ownerName"
                      placeholder="Nome do proprietário"
                      value={formData.ownerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerPhone">Celular do proprietário</Label>
                    <Input
                      id="ownerPhone"
                      placeholder="(11) 99999-9999"
                      value={formData.ownerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownerPhone: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Problem Description */}
          <div className="os-card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">Problema</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="problem">Descrição do problema *</Label>
                <Textarea
                  id="problem"
                  placeholder="Descreva detalhadamente o problema a ser resolvido..."
                  rows={4}
                  value={formData.problem}
                  onChange={(e) => setFormData(prev => ({ ...prev, problem: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="urgency">Grau de urgência *</Label>
                <Select 
                  value={formData.urgency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value as UrgencyLevel }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a urgência" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(URGENCY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <span className={`urgency-indicator urgency-${value}`} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Photo Upload */}
              <div>
                <Label>Fotos do problema (opcional)</Label>
                <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Clique para enviar ou arraste as fotos
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo 5 fotos
                    </p>
                  </label>
                </div>
                {formData.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.photos.map((file, index) => (
                      <div key={index} className="relative">
                        <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                          {file.name.slice(0, 8)}...
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            photos: prev.photos.filter((_, i) => i !== index)
                          }))}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Requester Info */}
          <div className="os-card">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">Solicitante</h2>
            </div>

            <div>
              <Label htmlFor="requesterName">Nome do solicitante *</Label>
              <Input
                id="requesterName"
                placeholder="Nome do inquilino, proprietário ou responsável"
                value={formData.requesterName}
                onChange={(e) => setFormData(prev => ({ ...prev, requesterName: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Abrir Chamado
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default NovoChamado;
