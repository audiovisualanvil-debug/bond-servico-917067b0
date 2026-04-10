-- Allow imobiliarias to view completion report files for their own service orders
CREATE POLICY "Imobiliarias can view completion report files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'completion-reports'
  AND EXISTS (
    SELECT 1 FROM public.service_orders so
    JOIN public.completion_reports cr ON cr.service_order_id = so.id
    WHERE so.imobiliaria_id = auth.uid()
      AND (storage.foldername(name))[1] = so.tecnico_id::text
  )
);