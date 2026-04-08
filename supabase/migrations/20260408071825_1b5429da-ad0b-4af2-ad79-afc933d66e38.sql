
-- Fix existing invalid os_numbers
UPDATE service_orders SET os_number = 'OS-00001' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
UPDATE service_orders SET os_number = 'OS-00002' WHERE id = '1af5dbca-1a49-4a4e-8fb1-bd6b0dd437f9';

-- Replace the generate_os_number function to handle invalid formats
CREATE OR REPLACE FUNCTION public.generate_os_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(os_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.service_orders
    WHERE os_number IS NOT NULL
      AND os_number ~ '^OS-[0-9]+$';
  NEW.os_number := 'OS-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

-- Recreate trigger (drop if exists, then create)
DROP TRIGGER IF EXISTS set_os_number ON public.service_orders;
CREATE TRIGGER set_os_number
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW
  WHEN (NEW.os_number IS NULL)
  EXECUTE FUNCTION public.generate_os_number();
