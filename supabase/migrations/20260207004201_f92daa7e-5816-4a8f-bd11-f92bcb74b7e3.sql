
-- Create service_order_items table for itemized costs
CREATE TABLE public.service_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  real_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER trg_service_order_items_updated_at
  BEFORE UPDATE ON public.service_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;

-- RLS: Admin sees all items
CREATE POLICY "Admin can manage all items"
  ON public.service_order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Tecnico can manage items on assigned orders
CREATE POLICY "Tecnico can insert items on assigned orders"
  ON public.service_order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.tecnico_id = auth.uid()
    )
  );

CREATE POLICY "Tecnico can view items on assigned orders"
  ON public.service_order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.tecnico_id = auth.uid()
    )
  );

CREATE POLICY "Tecnico can update items on assigned orders"
  ON public.service_order_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.tecnico_id = auth.uid()
    )
  );

CREATE POLICY "Tecnico can delete items on assigned orders"
  ON public.service_order_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.tecnico_id = auth.uid()
    )
  );

-- RLS: Imobiliaria CANNOT see real_cost (use view), but can see items on own orders
-- They see items via the view below, not directly
CREATE POLICY "Imobiliaria can view items on own orders"
  ON public.service_order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.imobiliaria_id = auth.uid()
    )
  );

-- Performance index
CREATE INDEX idx_service_order_items_so ON public.service_order_items(service_order_id);

-- View that hides real_cost from imobiliaria queries
CREATE VIEW public.service_order_items_client
WITH (security_invoker = true)
AS
SELECT id, service_order_id, description, created_at, updated_at
FROM public.service_order_items;
