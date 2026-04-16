-- Performance indexes for service_orders (most queried table)
CREATE INDEX IF NOT EXISTS idx_service_orders_imobiliaria_id ON public.service_orders (imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_tecnico_id ON public.service_orders (tecnico_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_property_id ON public.service_orders (property_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders (status);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON public.service_orders (created_at DESC);

-- Performance indexes for properties
CREATE INDEX IF NOT EXISTS idx_properties_imobiliaria_id ON public.properties (imobiliaria_id);

-- Performance indexes for completion_reports
CREATE INDEX IF NOT EXISTS idx_completion_reports_service_order_id ON public.completion_reports (service_order_id);

-- Performance indexes for service_order_comments
CREATE INDEX IF NOT EXISTS idx_service_order_comments_service_order_id ON public.service_order_comments (service_order_id);

-- Performance indexes for service_order_items
CREATE INDEX IF NOT EXISTS idx_service_order_items_service_order_id ON public.service_order_items (service_order_id);

-- Optimize has_role function: remove inner admin check (unnecessary overhead for SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;