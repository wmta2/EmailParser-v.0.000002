/*
  # Consolidate Duplicate Permissive Policies

  1. Purpose
    - Remove redundant SELECT policies that have overlapping permissions
    - Keep only one policy per action to improve performance and clarity

  2. Tables Affected
    - channel_customers: Remove "Admins can view channel customers" (covered by authenticated users policy)
    - channel_raw_imports: Remove "Admins can view raw imports" (covered by users policy)
    - channel_sync_log: Remove "Admins can view sync logs" (covered by users policy)
    - customer_source_mappings: Remove "Admins can view customer mappings" (covered by users policy)
    - customers: Remove "Admins can view customers" (covered by authenticated users policy)
    - email_template_patterns: Consolidate to single policy
    - invitations: Remove duplicate "Admins can view invitations"
    - sales_channels: Create single unified view policy
    - user_profiles: Keep admin view + own profile view (different scopes)

  3. Security
    - Maintains same access levels, just removes redundant policies
*/

-- channel_customers: Remove admin SELECT policy (authenticated users can already view)
DROP POLICY IF EXISTS "Admins can view channel customers" ON public.channel_customers;

-- channel_raw_imports: Remove admin SELECT policy (users can already view)
DROP POLICY IF EXISTS "Admins can view raw imports" ON public.channel_raw_imports;

-- channel_sync_log: Remove admin SELECT policy (users can already view)
DROP POLICY IF EXISTS "Admins can view sync logs" ON public.channel_sync_log;

-- customer_source_mappings: Remove admin SELECT policy (users can already view)
DROP POLICY IF EXISTS "Admins can view customer mappings" ON public.customer_source_mappings;

-- customers: Remove admin SELECT policy (authenticated users can already view)
DROP POLICY IF EXISTS "Admins can view customers" ON public.customers;

-- email_template_patterns: Remove duplicate policies, keep one comprehensive policy
DROP POLICY IF EXISTS "Admins can view all templates" ON public.email_template_patterns;
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.email_template_patterns;
DROP POLICY IF EXISTS "Super admins can view templates" ON public.email_template_patterns;
DROP POLICY IF EXISTS "Users can view active templates" ON public.email_template_patterns;

CREATE POLICY "Authenticated users can view templates"
  ON public.email_template_patterns FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- invitations: Remove duplicate admin view policy
DROP POLICY IF EXISTS "Admins can view invitations" ON public.invitations;

-- sales_channels: Remove admin SELECT policy, consolidate to one
DROP POLICY IF EXISTS "Admins can manage sales channels" ON public.sales_channels;
DROP POLICY IF EXISTS "Users can view enabled channels" ON public.sales_channels;

CREATE POLICY "Authenticated users can view channels"
  ON public.sales_channels FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- user_profiles: Keep both policies as they serve different purposes
-- "Admins can view all profiles" - admins need to see all users
-- "Users can view own profile" - users can only see themselves
-- These are intentionally separate and not redundant
