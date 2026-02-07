
-- Add FK constraints from service_orders/properties to profiles
-- This enables Supabase's automatic JOIN syntax
ALTER TABLE public.service_orders
  ADD CONSTRAINT fk_so_imobiliaria_profile 
  FOREIGN KEY (imobiliaria_id) REFERENCES public.profiles(id);

ALTER TABLE public.service_orders
  ADD CONSTRAINT fk_so_tecnico_profile 
  FOREIGN KEY (tecnico_id) REFERENCES public.profiles(id);

ALTER TABLE public.properties
  ADD CONSTRAINT fk_prop_imobiliaria_profile 
  FOREIGN KEY (imobiliaria_id) REFERENCES public.profiles(id);
