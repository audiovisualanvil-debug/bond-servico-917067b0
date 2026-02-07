
-- Add phone columns for tenant and owner on properties
ALTER TABLE public.properties
  ADD COLUMN tenant_phone text,
  ADD COLUMN owner_phone text;
