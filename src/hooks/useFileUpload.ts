import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BUCKET = 'service-photos';

export function useFileUpload() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (files: File[], folder: string): Promise<string[]> => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar fotos');
      return [];
    }

    setIsUploading(true);
    const urls: string[] = [];

    try {
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const fileName = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(fileName);

        urls.push(urlData.publicUrl);
      }

      if (urls.length > 0) {
        toast.success(`${urls.length} foto(s) enviada(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar fotos');
    } finally {
      setIsUploading(false);
    }

    return urls;
  };

  return { uploadFiles, isUploading };
}
