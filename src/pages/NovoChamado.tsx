import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, MapPin, AlertTriangle, User, Send, ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { UrgencyLevel, URGENCY_LABELS } from '@/types/serviceOrder';
import { useProperties, useCreateProperty } from '@/hooks/useProperties';
import { useCreateServiceOrder } from '@/hooks/useServiceOrders';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { typedFrom } from '@/integrations/supabase/helpers';

const NovoChamado = () => {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = useAuth();
  const { data: userProperties = [], isLoading: propertiesLoading } = useProperties();
  const createProperty = useCreateProperty();
  const createOrder = useCreateServiceOrder();
  const { uploadFiles, isUploading } = useFileUpload();

  const { data: imobiliarias = [] } = useQuery({
    queryKey: ['imobiliarias-list'],
    queryFn: async () => {
      const { data, error } = await typedFrom('user_roles')
        .select('user_id')
        .eq('role', 'imobiliaria');
      if (error) throw error;
      const userIds = (data as { user_id: string }[]).map(r => r.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles, error: profileError } = await typedFrom('profiles')
        .select('*')
        .in('id', userIds);
      if (profileError) throw profileError;
      return profiles as { id: string; name: string; company: string | null }[];
    },
    enabled: role === 'admin',
  });

  const [selectedImobiliariaId, setSelectedImobiliariaId] = useState('');
  const { data: imobiliariaProperties = [], isLoading: imobPropsLoading } = useQuery({
    queryKey: ['properties-for-imob', selectedImobiliariaId],
    queryFn: async () => {
      const { data, error } = await typedFrom('properties')
        .select('*')
        .eq('imobiliaria_id', selectedImobiliariaId)
        .order('address');
      if (error) throw error;
      return data as any[];
    },
    enabled: role === 'admin' && !!selectedImobiliariaId,
  });

  const availableProperties = role === 'admin' ? imobiliariaProperties : userProperties;

  const [formData, setFormData] = useState({
    propertyId: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '',
    code: '',
    tenantName: '',
    tenantPhone: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    problem: '',
    urgency: '' as UrgencyLevel | '',
    requesterName: '',
    photos: [] as File[],
  });

  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !role) return null;

  const isSubmitting = createOrder.isPending || createProperty.isPending || isUploading;
  const effectiveImobiliariaId = role === 'admin' ? selectedImobiliariaId : user.id;

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      toast.success('Endereço preenchido pelo CEP!');
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (role === 'admin' && !selectedImobiliariaId) {
      errors.imobiliaria = 'Selecione uma imobiliária';
    }

    if (!formData.propertyId) {
      errors.property = 'Selecione ou cadastre um imóvel';
    }

    if (formData.propertyId === 'new') {
      if (!formData.street.trim()) errors.street = 'Informe a rua do imóvel';
      if (!formData.neighborhood.trim()) errors.neighborhood = 'Informe o bairro do imóvel';
    }

    if (!formData.problem.trim()) {
      errors.problem = 'Descreva o problema a ser resolvido';
    }

    if (!formData.urgency) {
      errors.urgency = 'Selecione o grau de urgência';
    }

    if (!formData.requesterName.trim()) {
      errors.requesterName = 'Informe o nome do solicitante';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Scroll to first error
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    return true;
  };

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      let propertyId = formData.propertyId;

      if (propertyId === 'new') {
        if (!formData.street || !formData.neighborhood) {
          return; // Already caught by validateForm
        }

        const fullAddress = [
          formData.street,
          formData.number ? `nº ${formData.number}` : '',
          formData.complement,
        ].filter(Boolean).join(', ');

        const newProperty = await createProperty.mutateAsync({
          imobiliaria_id: effectiveImobiliariaId,
          address: fullAddress,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode || undefined,
          code: formData.code || undefined,
          tenant_name: formData.tenantName || undefined,
          tenant_phone: formData.tenantPhone || undefined,
          owner_name: formData.ownerName || undefined,
          owner_phone: formData.ownerPhone || undefined,
          owner_email: formData.ownerEmail || undefined,
        });

        propertyId = newProperty.id;
      }

      if (!propertyId || propertyId === 'new') {
        return; // Already caught by validateForm
      }

      // Upload photos to storage if any
      let photoUrls: string[] = [];
      if (formData.photos.length > 0) {
        photoUrls = await uploadFiles(formData.photos, `os-creation/${crypto.randomUUID()}`);
      }

      const newOrder = await createOrder.mutateAsync({
        property_id: propertyId,
        imobiliaria_id: effectiveImobiliariaId,
        problem: formData.problem,
        urgency: formData.urgency,
        requester_name: formData.requesterName,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
      });

      toast.success('Ordem de Serviço criada com sucesso!', {
        description: `Número: ${newOrder.os_number || 'Gerado automaticamente'}`,
        duration: 5000,
      });

      navigate(`/ordens/${newOrder.id}`);
    } catch (error: any) {
      toast.error('Erro ao abrir chamado', {
        description: error.message || 'Tente novamente.',
      });
    }
  };

  // FIX: Erro #10 - Validação de upload de fotos (tipo, tamanho, limite)
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" — formato inválido. Use JPG, PNG ou WebP.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" — tamanho excede 5MB.`);
        continue;
      }
      validFiles.push(file);
    }

    setFormData(prev => {
      const combined = [...prev.photos, ...validFiles];
      if (combined.length > 5) {
        toast.error('Máximo de 5 fotos permitido.');
      }
      return { ...prev, photos: combined.slice(0, 5) };
    });

    // Reset input to allow re-selecting same file
    e.target.value = '';
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

        <form onSubmit={handleSubmit} ref={formRef} className="space-y-8" noValidate>
          {/* Admin: Select Imobiliária */}
          {role === 'admin' && (
            <div className="os-card">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Imobiliária</h2>
              </div>
              <div id="field-imobiliaria">
                <Label>Selecionar imobiliária *</Label>
                <Select
                  value={selectedImobiliariaId || undefined}
                  onValueChange={(value) => {
                    setSelectedImobiliariaId(value);
                    setFormData(prev => ({ ...prev, propertyId: '' }));
                    clearFieldError('imobiliaria');
                  }}
                >
                  <SelectTrigger className={fieldErrors.imobiliaria ? 'border-destructive ring-destructive' : ''}>
                    <SelectValue placeholder="Escolha uma imobiliária..." />
                  </SelectTrigger>
                  <SelectContent>
                    {imobiliarias.map((imob) => (
                      <SelectItem key={imob.id} value={imob.id}>
                        {imob.company || imob.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.imobiliaria && <p className="text-sm text-destructive mt-1">{fieldErrors.imobiliaria}</p>}
              </div>
            </div>
          )}

          {/* Property Selection */}
          <div className="os-card">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">Imóvel</h2>
            </div>

            <div className="space-y-4">
              <div id="field-property">
                <Label htmlFor="property">Selecionar imóvel cadastrado *</Label>
                <Select
                  value={formData.propertyId || undefined}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, propertyId: value }));
                    clearFieldError('property');
                  }}
                  disabled={role === 'admin' && !selectedImobiliariaId}
                >
                  <SelectTrigger className={fieldErrors.property ? 'border-destructive ring-destructive' : ''}>
                    <SelectValue placeholder={
                      role === 'admin' && !selectedImobiliariaId
                        ? 'Selecione uma imobiliária primeiro'
                        : propertiesLoading || imobPropsLoading
                          ? 'Carregando...'
                          : 'Escolha um imóvel...'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Cadastrar novo imóvel</SelectItem>
                    {availableProperties.map((property: any) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.address} - {property.neighborhood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.property && <p className="text-sm text-destructive mt-1">{fieldErrors.property}</p>}
              </div>

              {formData.propertyId === 'new' && (
                <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                  <div>
                    <Label htmlFor="code">Código do imóvel</Label>
                    <Input id="code" placeholder="Ex: AP-101, SALA-03" value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} />
                  </div>

                  {/* CEP with auto-lookup */}
                  <div>
                    <Label htmlFor="zipCode">CEP</Label>
                    <div className="relative">
                      <Input
                        id="zipCode"
                        placeholder="00000-000"
                        value={formData.zipCode}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ ...prev, zipCode: value }));
                          const clean = value.replace(/\D/g, '');
                          if (clean.length === 8) {
                            handleCepLookup(value);
                          }
                        }}
                      />
                      {isFetchingCep && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Digite o CEP para preencher automaticamente</p>
                  </div>

                  {/* Street */}
                  <div className="md:col-span-2" id="field-street">
                    <Label htmlFor="street">Rua / Logradouro *</Label>
                    <Input id="street" placeholder="Rua, Avenida, etc." value={formData.street} onChange={(e) => { setFormData(prev => ({ ...prev, street: e.target.value })); clearFieldError('street'); }} className={fieldErrors.street ? 'border-destructive' : ''} />
                    {fieldErrors.street && <p className="text-sm text-destructive mt-1">{fieldErrors.street}</p>}
                  </div>

                  {/* Number + Complement */}
                  <div>
                    <Label htmlFor="number">Número</Label>
                    <Input id="number" placeholder="123" value={formData.number} onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input id="complement" placeholder="Apto, Bloco, Sala..." value={formData.complement} onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))} />
                  </div>

                  <div id="field-neighborhood">
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input id="neighborhood" placeholder="Bairro" value={formData.neighborhood} onChange={(e) => { setFormData(prev => ({ ...prev, neighborhood: e.target.value })); clearFieldError('neighborhood'); }} className={fieldErrors.neighborhood ? 'border-destructive' : ''} />
                    {fieldErrors.neighborhood && <p className="text-sm text-destructive mt-1">{fieldErrors.neighborhood}</p>}
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" placeholder="Cidade" value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" placeholder="SP" value={formData.state} onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))} maxLength={2} />
                  </div>

                  <div>
                    <Label htmlFor="tenantName">Inquilino</Label>
                    <Input id="tenantName" placeholder="Nome do inquilino" value={formData.tenantName} onChange={(e) => setFormData(prev => ({ ...prev, tenantName: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="tenantPhone">Celular do inquilino</Label>
                    <PhoneInput id="tenantPhone" placeholder="(11) 99999-9999" value={formData.tenantPhone} onChange={(value) => setFormData(prev => ({ ...prev, tenantPhone: value }))} />
                  </div>
                  <div>
                    <Label htmlFor="ownerName">Proprietário</Label>
                    <Input id="ownerName" placeholder="Nome do proprietário" value={formData.ownerName} onChange={(e) => setFormData(prev => ({ ...prev, ownerName: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="ownerPhone">Celular do proprietário</Label>
                    <PhoneInput id="ownerPhone" placeholder="(11) 99999-9999" value={formData.ownerPhone} onChange={(value) => setFormData(prev => ({ ...prev, ownerPhone: value }))} />
                  </div>
                  <div>
                    <Label htmlFor="ownerEmail">E-mail do proprietário</Label>
                    <Input id="ownerEmail" type="email" placeholder="proprietario@email.com" value={formData.ownerEmail} onChange={(e) => setFormData(prev => ({ ...prev, ownerEmail: e.target.value }))} />
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
              <div id="field-problem">
                <Label htmlFor="problem">Descrição do problema *</Label>
                <Textarea id="problem" placeholder="Descreva detalhadamente o problema a ser resolvido..." rows={4} value={formData.problem} onChange={(e) => { setFormData(prev => ({ ...prev, problem: e.target.value })); clearFieldError('problem'); }} className={fieldErrors.problem ? 'border-destructive' : ''} />
                {fieldErrors.problem && <p className="text-sm text-destructive mt-1">{fieldErrors.problem}</p>}
              </div>

              <div id="field-urgency">
                <Label htmlFor="urgency">Grau de urgência *</Label>
                <Select value={formData.urgency} onValueChange={(value) => { setFormData(prev => ({ ...prev, urgency: value as UrgencyLevel })); clearFieldError('urgency'); }}>
                  <SelectTrigger className={fieldErrors.urgency ? 'border-destructive ring-destructive' : ''}>
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
                {fieldErrors.urgency && <p className="text-sm text-destructive mt-1">{fieldErrors.urgency}</p>}
              </div>

              {/* Photo Upload */}
              <div>
                <Label>Fotos do problema (opcional)</Label>
                <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  {/* FIX: Erro #10 - Aceitar apenas jpg/png/webp */}
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para enviar ou arraste as fotos</p>
                    <p className="text-xs text-muted-foreground mt-1">Máximo 5 fotos</p>
                  </label>
                </div>
                {formData.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.photos.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="h-16 w-16 rounded-lg overflow-hidden border border-border">
                          <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))} className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div id="field-requesterName">
              <Label htmlFor="requesterName">Nome do solicitante *</Label>
              <Input id="requesterName" placeholder="Nome do inquilino, proprietário ou responsável" value={formData.requesterName} onChange={(e) => { setFormData(prev => ({ ...prev, requesterName: e.target.value })); clearFieldError('requesterName'); }} className={fieldErrors.requesterName ? 'border-destructive' : ''} />
              {fieldErrors.requesterName && <p className="text-sm text-destructive mt-1">{fieldErrors.requesterName}</p>}
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