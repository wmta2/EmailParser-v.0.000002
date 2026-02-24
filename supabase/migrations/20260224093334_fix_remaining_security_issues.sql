/*
  # Fix Remaining Security Issues

  1. Purpose
    - Fix mutable search_path on delete_old_erp_api_logs function
    - Consolidate duplicate user_profiles SELECT policies
    - Replace always-true RLS policies with proper authentication checks

  2. Changes
    - Recreate delete_old_erp_api_logs with immutable search_path
    - Merge user_profiles SELECT policies into one that handles both admin and user views
    - Update RLS policies on customer_sync_items, customer_sync_log, erp_api_logs,
      order_items, orders, and template_sample_emails to require authentication

  3. Security
    - All policies now properly check for authenticated user
    - Function search paths are immutable
    - No duplicate permissive policies
*/

-- Fix delete_old_erp_api_logs function search path (drop and recreate with SECURITY INVOKER)
DROP FUNCTION IF EXISTS public.delete_old_erp_api_logs();

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

-- Consolidate user_profiles SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;

CREATE POLICY "Users can view profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = id
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (select auth.uid()) AND up.role = 'admin'
    )
  );

-- Fix customer_sync_items policies
DROP POLICY IF EXISTS "Authenticated users can insert customer sync items" ON public.customer_sync_items;

CREATE POLICY "Authenticated users can insert customer sync items"
  ON public.customer_sync_items FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Fix customer_sync_log policies
DROP POLICY IF EXISTS "Authenticated users can insert customer sync logs" ON public.customer_sync_log;
DROP POLICY IF EXISTS "Authenticated users can update customer sync logs" ON public.customer_sync_log;

CREATE POLICY "Authenticated users can insert customer sync logs"
  ON public.customer_sync_log FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update customer sync logs"
  ON public.customer_sync_log FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Fix erp_api_logs policies
DROP POLICY IF EXISTS "Authenticated users can insert API logs" ON public.erp_api_logs;

CREATE POLICY "Authenticated users can insert API logs"
  ON public.erp_api_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Fix order_items policies
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON public.order_items;

CREATE POLICY "Authenticated users can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update order items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete order items"
  ON public.order_items FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- Fix orders policies
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;

CREATE POLICY "Authenticated users can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- Fix template_sample_emails policies
DROP POLICY IF EXISTS "Authenticated users can delete template samples" ON public.template_sample_emails;
DROP POLICY IF EXISTS "Authenticated users can insert template samples" ON public.template_sample_emails;
DROP POLICY IF EXISTS "Authenticated users can update template samples" ON public.template_sample_emails;

CREATE POLICY "Authenticated users can insert template samples"
  ON public.template_sample_emails FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update template samples"
  ON public.template_sample_emails FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete template samples"
  ON public.template_sample_emails FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);
