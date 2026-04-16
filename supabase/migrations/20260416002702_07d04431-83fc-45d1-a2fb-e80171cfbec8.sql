
-- Fix: Restrict comment insertion to users who have access to the service order
DROP POLICY IF EXISTS "Authors can insert comments" ON public.service_order_comments;

CREATE POLICY "Authors can insert comments on accessible orders"
ON public.service_order_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.service_orders
      WHERE id = service_order_comments.service_order_id
        AND (imobiliaria_id = auth.uid() OR tecnico_id = auth.uid())
    )
  )
);
