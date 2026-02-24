/*
  # Create is_admin Helper Function and Update Policies

  1. Purpose
    - Create a helper function to check admin status from JWT
    - Update all policies that reference user_profiles to use JWT instead
    - Improves performance and avoids potential recursion issues

  2. Changes
    - Create public.is_admin() function using JWT app_metadata
    - Update 15 policies across multiple tables to use the new function
*/

-- Create helper function to check admin status from JWT
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'),
    false
  );
$$;

-- Update invitations policies
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.invitations;
CREATE POLICY "Admins can view all invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Update sales_channels policies
DROP POLICY IF EXISTS "Admins can update sales channels" ON public.sales_channels;
CREATE POLICY "Admins can update sales channels"
  ON public.sales_channels
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete sales channels" ON public.sales_channels;
CREATE POLICY "Admins can delete sales channels"
  ON public.sales_channels
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Update channel_configurations policies
DROP POLICY IF EXISTS "Admins can view channel configs" ON public.channel_configurations;
CREATE POLICY "Admins can view channel configs"
  ON public.channel_configurations
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update channel configs" ON public.channel_configurations;
CREATE POLICY "Admins can update channel configs"
  ON public.channel_configurations
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete channel configs" ON public.channel_configurations;
CREATE POLICY "Admins can delete channel configs"
  ON public.channel_configurations
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Update erp_api_logs policies
DROP POLICY IF EXISTS "Admins can view API logs" ON public.erp_api_logs;
CREATE POLICY "Admins can view API logs"
  ON public.erp_api_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Update customers policies
DROP POLICY IF EXISTS "Admins can update customers" ON public.customers;
CREATE POLICY "Admins can update customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
CREATE POLICY "Admins can delete customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Update customer_source_mappings policies
DROP POLICY IF EXISTS "Admins can update customer mappings" ON public.customer_source_mappings;
CREATE POLICY "Admins can update customer mappings"
  ON public.customer_source_mappings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete customer mappings" ON public.customer_source_mappings;
CREATE POLICY "Admins can delete customer mappings"
  ON public.customer_source_mappings
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Update channel_sync_log policies
DROP POLICY IF EXISTS "Admins can update sync logs" ON public.channel_sync_log;
CREATE POLICY "Admins can update sync logs"
  ON public.channel_sync_log
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Update channel_raw_imports policies
DROP POLICY IF EXISTS "Admins can update raw imports" ON public.channel_raw_imports;
CREATE POLICY "Admins can update raw imports"
  ON public.channel_raw_imports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Update channel_customers policies
DROP POLICY IF EXISTS "Admins can update channel customers" ON public.channel_customers;
CREATE POLICY "Admins can update channel customers"
  ON public.channel_customers
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete channel customers" ON public.channel_customers;
CREATE POLICY "Admins can delete channel customers"
  ON public.channel_customers
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
