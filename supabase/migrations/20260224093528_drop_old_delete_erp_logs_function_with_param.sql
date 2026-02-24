/*
  # Drop Old delete_old_erp_api_logs Function Variant

  1. Purpose
    - Remove old function variant with days_to_keep parameter
    - This version has SECURITY DEFINER without search_path set

  2. Changes
    - Drop the function with days_to_keep parameter
*/

DROP FUNCTION IF EXISTS public.delete_old_erp_api_logs(integer);
