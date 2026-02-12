
-- Add payment_method to service_orders
ALTER TABLE public.service_orders
ADD COLUMN IF NOT EXISTS payment_method text;

-- Add check constraint for valid values
ALTER TABLE public.service_orders
ADD CONSTRAINT service_orders_payment_method_check
CHECK (payment_method IN ('imobiliaria', 'pix', 'cartao') OR payment_method IS NULL);

-- Add owner_email to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS owner_email text;
