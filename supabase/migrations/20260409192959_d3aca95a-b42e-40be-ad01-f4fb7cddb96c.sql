ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS labor_cost numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS material_cost numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_cost numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;