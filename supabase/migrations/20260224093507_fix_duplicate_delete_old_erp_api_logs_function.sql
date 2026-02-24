/*
  # Fix Duplicate delete_old_erp_api_logs Function

  1. Purpose
    - Remove duplicate function versions
    - Ensure single function with immutable search_path

  2. Changes
    - Drop all versions of the function
    - Recreate with proper security settings
*/

-- Drop all versions of the function
DROP FUNCTION IF EXISTS public.delete_old_erp_api_logs() CASCADE;

-- Recreate with immutable search_path
CREATE FUNCTION public.delete_old_erp_api_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.erp_api_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$;
