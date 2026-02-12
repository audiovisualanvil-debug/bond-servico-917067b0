
-- Create service_order_comments table
CREATE TABLE public.service_order_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  visible_to_imobiliaria BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_order_comments ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin can manage all comments"
  ON public.service_order_comments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Tecnico can create comments on assigned orders
CREATE POLICY "Tecnico can create comments on assigned orders"
  ON public.service_order_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = service_order_comments.service_order_id
      AND so.tecnico_id = auth.uid()
    )
  );

-- Tecnico can view comments on assigned orders
CREATE POLICY "Tecnico can view comments on assigned orders"
  ON public.service_order_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = service_order_comments.service_order_id
      AND so.tecnico_id = auth.uid()
    )
  );

-- Imobiliaria can only see comments marked visible_to_imobiliaria
CREATE POLICY "Imobiliaria can view visible comments on own orders"
  ON public.service_order_comments
  FOR SELECT
  USING (
    visible_to_imobiliaria = true AND
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = service_order_comments.service_order_id
      AND so.imobiliaria_id = auth.uid()
    )
  );
