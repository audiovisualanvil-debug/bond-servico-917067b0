-- Create the trigger that was missing
DROP TRIGGER IF EXISTS generate_os_number_trigger ON public.service_orders;

CREATE TRIGGER generate_os_number_trigger
BEFORE INSERT ON public.service_orders
FOR EACH ROW
WHEN (NEW.os_number IS NULL)
EXECUTE FUNCTION public.generate_os_number();