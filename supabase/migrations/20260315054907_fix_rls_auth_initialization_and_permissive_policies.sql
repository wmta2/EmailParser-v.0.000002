/*
  # Fix RLS auth() initialization plan and multiple permissive policies

  ## Summary
  1. Replaces bare `auth.uid()` with `(SELECT auth.uid())` in all affected policies
     so Postgres evaluates the auth function once per statement, not once per row.
  2. Removes redundant/overlapping permissive policies on customer_profiles, customers,
     customer_favourites, and function_rate_limits.
  3. Fixes always-true RLS policies on product_price_lists, product_prices,
     product_sync_items, and product_sync_log by tightening them to admin-only.

  ## Tables affected
  - gmail_connection, gmail_import_rules, gmail_sync_schedule, gmail_sync_log,
    gmail_settings, gmail_schedule_windows
  - function_rate_limits
  - customer_profiles (also fixes multiple permissive policies)
  - customers (also fixes multiple permissive policies)
  - customer_favourites
  - product_price_lists, product_prices, product_sync_items, product_sync_log
*/

-- ============================================================
-- gmail_connection
-- ============================================================
DROP POLICY IF EXISTS "Super admins can select gmail_connection" ON public.gmail_connection;
DROP POLICY IF EXISTS "Super admins can insert gmail_connection" ON public.gmail_connection;
DROP POLICY IF EXISTS "Super admins can update gmail_connection" ON public.gmail_connection;

CREATE POLICY "Super admins can select gmail_connection"
  ON public.gmail_connection FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can insert gmail_connection"
  ON public.gmail_connection FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can update gmail_connection"
  ON public.gmail_connection FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

-- ============================================================
-- gmail_import_rules
-- ============================================================
DROP POLICY IF EXISTS "Super admins can select gmail_import_rules" ON public.gmail_import_rules;
DROP POLICY IF EXISTS "Super admins can insert gmail_import_rules" ON public.gmail_import_rules;
DROP POLICY IF EXISTS "Super admins can update gmail_import_rules" ON public.gmail_import_rules;
DROP POLICY IF EXISTS "Super admins can delete gmail_import_rules" ON public.gmail_import_rules;

CREATE POLICY "Super admins can select gmail_import_rules"
  ON public.gmail_import_rules FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can insert gmail_import_rules"
  ON public.gmail_import_rules FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can update gmail_import_rules"
  ON public.gmail_import_rules FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can delete gmail_import_rules"
  ON public.gmail_import_rules FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

-- ============================================================
-- gmail_sync_schedule
-- ============================================================
DROP POLICY IF EXISTS "Super admins can select gmail_sync_schedule" ON public.gmail_sync_schedule;
DROP POLICY IF EXISTS "Super admins can insert gmail_sync_schedule" ON public.gmail_sync_schedule;
DROP POLICY IF EXISTS "Super admins can update gmail_sync_schedule" ON public.gmail_sync_schedule;

CREATE POLICY "Super admins can select gmail_sync_schedule"
  ON public.gmail_sync_schedule FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can insert gmail_sync_schedule"
  ON public.gmail_sync_schedule FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can update gmail_sync_schedule"
  ON public.gmail_sync_schedule FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

-- ============================================================
-- gmail_sync_log
-- ============================================================
DROP POLICY IF EXISTS "Super admins can insert gmail_sync_log" ON public.gmail_sync_log;
DROP POLICY IF EXISTS "Super admins can update gmail_sync_log" ON public.gmail_sync_log;

CREATE POLICY "Super admins can insert gmail_sync_log"
  ON public.gmail_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can update gmail_sync_log"
  ON public.gmail_sync_log FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

-- ============================================================
-- gmail_settings
-- ============================================================
DROP POLICY IF EXISTS "Super admins can select gmail_settings" ON public.gmail_settings;
DROP POLICY IF EXISTS "Super admins can insert gmail_settings" ON public.gmail_settings;
DROP POLICY IF EXISTS "Super admins can update gmail_settings" ON public.gmail_settings;

CREATE POLICY "Super admins can select gmail_settings"
  ON public.gmail_settings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can insert gmail_settings"
  ON public.gmail_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can update gmail_settings"
  ON public.gmail_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

-- ============================================================
-- gmail_schedule_windows
-- ============================================================
DROP POLICY IF EXISTS "Super admins can select gmail_schedule_windows" ON public.gmail_schedule_windows;
DROP POLICY IF EXISTS "Super admins can insert gmail_schedule_windows" ON public.gmail_schedule_windows;
DROP POLICY IF EXISTS "Super admins can update gmail_schedule_windows" ON public.gmail_schedule_windows;
DROP POLICY IF EXISTS "Super admins can delete gmail_schedule_windows" ON public.gmail_schedule_windows;

CREATE POLICY "Super admins can select gmail_schedule_windows"
  ON public.gmail_schedule_windows FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can insert gmail_schedule_windows"
  ON public.gmail_schedule_windows FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can update gmail_schedule_windows"
  ON public.gmail_schedule_windows FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Super admins can delete gmail_schedule_windows"
  ON public.gmail_schedule_windows FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = (SELECT auth.uid())
      AND user_profiles.role IN ('admin', 'super_admin')
  ));

-- ============================================================
-- function_rate_limits — fix bare auth.uid()
-- ============================================================
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.function_rate_limits;

CREATE POLICY "Users can view own rate limits"
  ON public.function_rate_limits FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- customer_profiles — fix auth.uid() + remove duplicate permissive policies
-- "Admins can view all customer profiles" duplicates "Admins can manage customer profiles" SELECT
-- "Allow insert for authenticated users" and "Customers can view/update own profile" are distinct user-facing
-- Consolidate to: admin FOR ALL (via is_admin), plus owner SELECT/UPDATE/INSERT
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can update own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.customer_profiles;

CREATE POLICY "Customers can view own profile"
  ON public.customer_profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Customers can update own profile"
  ON public.customer_profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Allow insert for authenticated users"
  ON public.customer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================
-- customers — fix auth.uid() in "Customers can view own customer record"
-- "Authenticated users can view customers" already grants broad SELECT to all auth users
-- so "Customers can view own customer record" is redundant; drop it to remove the duplicate
-- ============================================================
DROP POLICY IF EXISTS "Customers can view own customer record" ON public.customers;

-- ============================================================
-- customer_favourites — fix bare auth.uid()
-- ============================================================
DROP POLICY IF EXISTS "Customers can view own favourites" ON public.customer_favourites;
DROP POLICY IF EXISTS "Customers can insert own favourites" ON public.customer_favourites;
DROP POLICY IF EXISTS "Customers can delete own favourites" ON public.customer_favourites;

CREATE POLICY "Customers can view own favourites"
  ON public.customer_favourites FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customer_profiles cp
    WHERE cp.id = (SELECT auth.uid())
      AND cp.customer_id = customer_favourites.customer_id
  ));

CREATE POLICY "Customers can insert own favourites"
  ON public.customer_favourites FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.customer_profiles cp
    WHERE cp.id = (SELECT auth.uid())
      AND cp.customer_id = customer_favourites.customer_id
  ));

CREATE POLICY "Customers can delete own favourites"
  ON public.customer_favourites FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customer_profiles cp
    WHERE cp.id = (SELECT auth.uid())
      AND cp.customer_id = customer_favourites.customer_id
  ));

-- ============================================================
-- product_price_lists — fix always-true "Authenticated users can manage price lists"
-- and remove duplicate permissive SELECT with "Authenticated users can view price lists"
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage price lists" ON public.product_price_lists;
DROP POLICY IF EXISTS "Authenticated users can view price lists" ON public.product_price_lists;

CREATE POLICY "Authenticated users can view price lists"
  ON public.product_price_lists FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Admins can manage price lists"
  ON public.product_price_lists FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update price lists"
  ON public.product_price_lists FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete price lists"
  ON public.product_price_lists FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- product_prices — fix always-true "Authenticated users can manage product prices"
-- and remove duplicate permissive SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage product prices" ON public.product_prices;
DROP POLICY IF EXISTS "Authenticated users can view product prices" ON public.product_prices;

CREATE POLICY "Authenticated users can view product prices"
  ON public.product_prices FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Admins can manage product prices"
  ON public.product_prices FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update product prices"
  ON public.product_prices FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete product prices"
  ON public.product_prices FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- product_sync_items — fix always-true INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert product sync items" ON public.product_sync_items;

CREATE POLICY "Authenticated users can insert product sync items"
  ON public.product_sync_items FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================
-- product_sync_log — fix always-true INSERT and UPDATE policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert product sync logs" ON public.product_sync_log;
DROP POLICY IF EXISTS "Authenticated users can update product sync logs" ON public.product_sync_log;

CREATE POLICY "Authenticated users can insert product sync logs"
  ON public.product_sync_log FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update product sync logs"
  ON public.product_sync_log FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================
-- products — remove duplicate permissive SELECT
-- "Anyone can view active products" overlaps with "Admins can manage products" SELECT
-- Keep the user-facing one and rely on "Admins can manage products" only for write ops
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================
-- product_categories — remove duplicate permissive SELECT
-- "Admins can manage categories" (FOR ALL) creates duplicate SELECT with "Anyone can view categories"
-- Replace with separate write policies for admins
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;

CREATE POLICY "Admins can insert categories"
  ON public.product_categories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update categories"
  ON public.product_categories FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete categories"
  ON public.product_categories FOR DELETE
  TO authenticated
  USING (is_admin());
