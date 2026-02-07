
-- 1. Allow admin to see ALL orders (including aguardando_orcamento_prestador)
DROP POLICY IF EXISTS "Admin can view all orders" ON public.service_orders;
CREATE POLICY "Admin can view all orders"
ON public.service_orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Allow admin to update ALL orders (including aguardando_orcamento_prestador)
DROP POLICY IF EXISTS "Admin can update all orders" ON public.service_orders;
CREATE POLICY "Admin can update all orders"
ON public.service_orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Allow admin to delete ALL orders
DROP POLICY IF EXISTS "Admin can delete orders" ON public.service_orders;
CREATE POLICY "Admin can delete orders"
ON public.service_orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Restrict technicians to only see orders assigned to them (no more unassigned browsing)
DROP POLICY IF EXISTS "Tecnico can view orders" ON public.service_orders;
CREATE POLICY "Tecnico can view orders"
ON public.service_orders
FOR SELECT
USING (tecnico_id = auth.uid());

-- 5. Restrict technicians to only update orders assigned to them
DROP POLICY IF EXISTS "Tecnico can update orders" ON public.service_orders;
CREATE POLICY "Tecnico can update orders"
ON public.service_orders
FOR UPDATE
USING (tecnico_id = auth.uid());

-- 6. Allow admin to view all profiles (needed to list technicians for assignment)
-- Already exists, but let's also ensure tecnico can view profiles of related parties
DROP POLICY IF EXISTS "Tecnico can view related profiles" ON public.profiles;
CREATE POLICY "Tecnico can view related profiles"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.tecnico_id = auth.uid()
    AND (so.imobiliaria_id = profiles.id)
  )
);
