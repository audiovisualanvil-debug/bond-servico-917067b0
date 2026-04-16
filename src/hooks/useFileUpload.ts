import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BUCKET = 'os-photos';
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365;

export function useFileUpload() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (files: File[], folder: string): Promise<string[]> => {
    if (!user) {
      toast.error('Você precisa estar logado para enviar fotos');
      return [];
    }

    if (files.length === 0) {
      return [];
    }

    setIsUploading(true);

    try {
      const uploadResults = await Promise.allSettled(
        files.map(async (file) => {
          const ext = file.name.split('.').pop();
          const fileName = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;

          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (error) {
            throw new Error(`Erro ao enviar ${file.name}`);
          }

          return fileName;
        })
      );

      const uploadedPaths = uploadResults
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map((result) => result.value);

      const failedUploads = uploadResults.filter((result) => result.status === 'rejected').length;

      if (uploadedPaths.length === 0) {
        throw new Error('Nenhuma foto conseguiu ser enviada. Tente novamente.');
      }

      const { data: signedUrls, error: signedUrlsError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(uploadedPaths, SIGNED_URL_EXPIRES_IN);

      const urls = signedUrlsError
        ? uploadedPaths
        : uploadedPaths.map((path, index) => signedUrls?.[index]?.signedUrl || path);

      if (failedUploads > 0) {
        toast.error(`${failedUploads} foto(s) falharam no envio.`);
      }

      toast.success(`${uploadedPaths.length} foto(s) enviada(s)`);
      return urls;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar fotos');
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading };
}
