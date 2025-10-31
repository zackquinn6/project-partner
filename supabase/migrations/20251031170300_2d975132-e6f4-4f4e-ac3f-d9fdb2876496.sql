-- Fix function search_path security issue
-- The update_updated_at_column function is missing search_path configuration
-- This poses a security risk as the function could be exploited via search_path manipulation

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;