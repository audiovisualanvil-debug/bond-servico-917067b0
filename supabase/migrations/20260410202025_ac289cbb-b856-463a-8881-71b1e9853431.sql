-- Update service orders: assign new imobiliaria and tecnico
UPDATE public.service_orders
SET imobiliaria_id = '29dc0b81-b9d1-4300-beeb-53a19dffe750',
    tecnico_id = 'fb3e2ae3-cba9-47ac-99e2-35bbad1a4fca'
WHERE id IN (
  'fcefe4c6-783a-4082-b385-5e87c95937ec',
  'a92f7882-d2ac-4d24-881d-8ad9352a2f9d',
  '5835ccc7-c245-4260-8f98-a0afacaaff4b'
);

-- Update properties: transfer to new imobiliaria
UPDATE public.properties
SET imobiliaria_id = '29dc0b81-b9d1-4300-beeb-53a19dffe750'
WHERE imobiliaria_id = '129a8b7a-4dee-47bb-8b80-6983aefef17d';