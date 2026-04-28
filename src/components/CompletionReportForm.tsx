import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  FileText, Camera, CheckCircle2, Loader2, X, Plus, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS_PER_SIDE = 10;

interface ChecklistItem {
  id: string;
  item: string;
  completed: boolean;
}

interface CompletionReportFormProps {
  onSubmit: (data: {
    description: string;
    observations: string;
    checklist: ChecklistItem[];
    photosBefore: string[];
    photosAfter: string[];
    technicianSignature: string;
  }) => void;
  isSubmitting: boolean;
  serviceOrderId: string;
}

export function CompletionReportForm({ onSubmit, isSubmitting, serviceOrderId }: CompletionReportFormProps) {
  const { uploadFiles, isUploading } = useFileUpload();
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState('');
  const [observations, setObservations] = useState('');
  const [technicianSignature, setTechnicianSignature] = useState('');
  const [photosBefore, setPhotosBefore] = useState<string[]>([]);
  const [photosAfter, setPhotosAfter] = useState<string[]>([]);
  const [pendingBefore, setPendingBefore] = useState<string[]>([]);
  const [pendingAfter, setPendingAfter] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', item: 'Problema identificado e diagnosticado', completed: false },
    { id: '2', item: 'Serviço executado conforme orçamento', completed: false },
    { id: '3', item: 'Área de trabalho limpa e organizada', completed: false },
    { id: '4', item: 'Cliente/morador informado sobre o serviço', completed: false },
    { id: '5', item: 'Teste de funcionamento realizado', completed: false },
  ]);

  const handlePhotoUpload = async (files: FileList | null, type: 'before' | 'after') => {
    if (!files || files.length === 0) return;

    const currentCount = type === 'before' ? photosBefore.length : photosAfter.length;
    const remainingSlots = MAX_PHOTOS_PER_SIDE - currentCount;

    if (remainingSlots <= 0) {
      toast.error(`Máximo de ${MAX_PHOTOS_PER_SIDE} fotos ${type === 'before' ? 'antes' : 'depois'} atingido.`);
      return;
    }

    const incoming = Array.from(files);
    const validFiles: File[] = [];

    for (const file of incoming) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" — formato inválido. Use JPG, PNG ou WebP.`);
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(`"${file.name}" — tamanho excede 5MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const accepted = validFiles.slice(0, remainingSlots);
    if (validFiles.length > remainingSlots) {
      toast.warning(`Apenas ${remainingSlots} foto(s) adicionada(s) — limite de ${MAX_PHOTOS_PER_SIDE} por seção.`);
    }

    // Optimistic preview via blob URLs
    const previews = accepted.map(f => URL.createObjectURL(f));
    if (type === 'before') {
      setPendingBefore(prev => [...prev, ...previews]);
    } else {
      setPendingAfter(prev => [...prev, ...previews]);
    }

    try {
      const folder = `${serviceOrderId}/${type}`;
      const urls = await uploadFiles(accepted, folder);
      if (type === 'before') {
        setPhotosBefore(prev => [...prev, ...urls]);
      } else {
        setPhotosAfter(prev => [...prev, ...urls]);
      }
    } catch (err: any) {
      toast.error('Falha no envio das fotos', { description: err?.message });
    } finally {
      // Remove pending previews and revoke blob URLs
      previews.forEach(u => URL.revokeObjectURL(u));
      if (type === 'before') {
        setPendingBefore(prev => prev.filter(u => !previews.includes(u)));
      } else {
        setPendingAfter(prev => prev.filter(u => !previews.includes(u)));
      }
    }
  };

  const removePhoto = (type: 'before' | 'after', index: number) => {
    if (type === 'before') {
      setPhotosBefore(prev => prev.filter((_, i) => i !== index));
    } else {
      setPhotosAfter(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist(prev => [
      ...prev,
      { id: crypto.randomUUID(), item: newChecklistItem.trim(), completed: false },
    ]);
    setNewChecklistItem('');
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(prev => prev.filter(i => i.id !== id));
  };

  const toggleChecklistItem = (id: string, checked: boolean) => {
    setChecklist(prev =>
      prev.map(i => (i.id === id ? { ...i, completed: checked } : i))
    );
  };

  const handleSubmit = () => {
    if (!description.trim()) return;
    if (!technicianSignature.trim()) return;
    onSubmit({
      description,
      observations,
      checklist,
      photosBefore,
      photosAfter,
      technicianSignature,
    });
  };

  const isFormValid = description.trim() && technicianSignature.trim();
  const isBusy = isSubmitting || isUploading;

  return (
    <div className="os-card">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="font-display font-semibold text-lg">Relatório de Execução</h2>
      </div>

      <div className="space-y-6">
        {/* Description */}
        <div>
          <Label className="text-sm font-semibold">Descrição do serviço executado *</Label>
          <Textarea
            placeholder="Descreva detalhadamente o que foi realizado, materiais utilizados, técnicas aplicadas..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="mt-1.5"
          />
        </div>

        {/* Checklist */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Checklist de Verificação</Label>
          <div className="space-y-2 mb-3">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group">
                <Checkbox
                  id={item.id}
                  checked={item.completed}
                  onCheckedChange={(checked) => toggleChecklistItem(item.id, !!checked)}
                />
                <label htmlFor={item.id} className="text-sm flex-1 cursor-pointer">
                  {item.item}
                </label>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar item ao checklist..."
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
              className="text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={addChecklistItem} disabled={!newChecklistItem.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Photos */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Before photos */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">📷 Fotos Antes</Label>
            <input
              ref={beforeInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files, 'before')}
            />
            {photosBefore.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {photosBefore.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={url} alt={`Antes ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto('before', i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => beforeInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Adicionar fotos
            </Button>
          </div>

          {/* After photos */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">📷 Fotos Depois</Label>
            <input
              ref={afterInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files, 'after')}
            />
            {photosAfter.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {photosAfter.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={url} alt={`Depois ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto('after', i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => afterInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Adicionar fotos
            </Button>
          </div>
        </div>

        {/* Observations */}
        <div>
          <Label className="text-sm font-semibold">Observações Adicionais</Label>
          <Textarea
            placeholder="Recomendações de manutenção, pontos de atenção, garantia do serviço..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            className="mt-1.5"
          />
        </div>

        {/* Signature */}
        <div>
          <Label className="text-sm font-semibold">Assinatura Digital do Profissional *</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nome completo do profissional responsável"
              value={technicianSignature}
              onChange={(e) => setTechnicianSignature(e.target.value)}
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          className="w-full bg-status-completed hover:bg-status-completed/90 text-primary-foreground"
          size="lg"
          disabled={!isFormValid || isBusy}
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Finalizar Serviço e Gerar Relatório
        </Button>
      </div>
    </div>
  );
}
