import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { withTimeout } from '@/lib/withTimeout';

const BUCKET = 'os-photos';
const STORAGE_TIMEOUT_MS = 15000;

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
        // Path starts with user.id to satisfy storage RLS ownership policy
        const fileName = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;

        const { error } = await withTimeout(
          supabase.storage
            .from(BUCKET)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            }),
          STORAGE_TIMEOUT_MS,
          `O envio de ${file.name} demorou demais.`
        );

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        // Bucket is private — use signed URLs instead of public URLs
        const { data: signedData, error: signError } = await withTimeout(
          supabase.storage
            .from(BUCKET)
            .createSignedUrl(fileName, 60 * 60 * 24 * 365),
          STORAGE_TIMEOUT_MS,
          `A geração do link da foto ${file.name} demorou demais.`
        );

        if (signError || !signedData?.signedUrl) {
          console.error('Signed URL error:', signError);
          // Fallback: store the path for later resolution
          urls.push(fileName);
        } else {
          urls.push(signedData.signedUrl);
        }
      }

      if (urls.length > 0) {
        toast.success(`${urls.length} foto(s) enviada(s)`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar fotos');
    } finally {
      setIsUploading(false);
    }

    return urls;
  };

  return { uploadFiles, isUploading };
}
