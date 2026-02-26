/*
  # Fix Security Issues

  This migration addresses the following security concerns:

  ## 1. Remove Unused Indexes
    - Drop unused index on channel_raw_imports (sync_log_id)
    - Drop unused index on delivery_address_sync_items (delivery_address_id)
    - Drop unused index on delivery_address_sync_log (erp_destination_id)
    - Drop unused index on erp_api_logs (erp_configuration_id)
    - Drop unused index on erp_configurations (erp_destination_id)
    - Drop unused index on invitations (invited_by)
    - Drop unused index on orders (confirmed_by)

  ## 2. Fix Function Search Path
    - Recreate find_customers_by_postcode function with immutable search_path
    - Set search_path explicitly to prevent security vulnerabilities

  ## Notes
    - Unused indexes consume storage and slow down write operations
    - Mutable search_paths in functions can be exploited for privilege escalation
    - The leaked password protection must be enabled via Supabase dashboard
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_channel_raw_imports_sync_log_id;
DROP INDEX IF EXISTS idx_delivery_address_sync_items_delivery_address_id;
DROP INDEX IF EXISTS idx_delivery_address_sync_log_erp_destination_id;
DROP INDEX IF EXISTS idx_erp_api_logs_erp_configuration_id;
DROP INDEX IF EXISTS idx_erp_configurations_erp_destination_id;
DROP INDEX IF EXISTS idx_invitations_invited_by;
DROP INDEX IF EXISTS idx_orders_confirmed_by;

-- Recreate find_customers_by_postcode function with fixed search_path
DROP FUNCTION IF EXISTS find_customers_by_postcode(text);

CREATE OR REPLACE FUNCTION find_customers_by_postcode(p_postcode text)
RETURNS TABLE (
  id uuid,
  name text,
  account_number text,
  supplier_code text,
  postcode text,
  email text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.account_number,
    c.supplier_code,
    c.postcode,
    c.email,
    c.phone
  FROM customers c
  WHERE UPPER(REPLACE(c.postcode, ' ', '')) = UPPER(REPLACE(p_postcode, ' ', ''))
  ORDER BY c.name;
END;
$$;