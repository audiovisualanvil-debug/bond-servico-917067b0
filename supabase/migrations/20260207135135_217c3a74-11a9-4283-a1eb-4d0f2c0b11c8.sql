
-- Add code, tenant_name, and owner_name columns to properties table
ALTER TABLE public.properties
ADD COLUMN code text,
ADD COLUMN tenant_name text,
ADD COLUMN owner_name text;
