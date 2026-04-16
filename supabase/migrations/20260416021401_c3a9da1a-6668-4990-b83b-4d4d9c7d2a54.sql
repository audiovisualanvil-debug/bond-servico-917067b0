CREATE OR REPLACE FUNCTION public.generate_os_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  -- Use advisory lock instead of table lock to prevent race conditions without blocking reads
  PERFORM pg_advisory_xact_lock(hashtext('generate_os_number'));
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(os_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.service_orders
    WHERE os_number IS NOT NULL
      AND os_number ~ '^OS-[0-9]+$';
  NEW.os_number := 'OS-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;