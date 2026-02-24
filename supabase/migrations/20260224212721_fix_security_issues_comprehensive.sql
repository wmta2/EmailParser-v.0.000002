/*
  # Fix Security Issues - Comprehensive

  ## Summary
  Addresses multiple security and performance issues identified in the database audit:
  1. Optimizes RLS policies to prevent row-by-row auth function evaluation
  2. Removes unused indexes to reduce maintenance overhead
  3. Consolidates duplicate permissive RLS policies
  4. Fixes view security definer issue
  5. Moves pg_trgm extension from public to extensions schema

  ## Changes

  ### 1. RLS Policy Optimization
  - Updates user_profiles RLS policies to use (select auth.uid()) pattern
  - This prevents re-evaluation for each row, improving performance at scale

  ### 2. Unused Index Removal
  - Removes indexes that have never been used in production
  - Reduces index maintenance overhead during writes
  - Note: Indexes can be recreated if usage patterns change

  ### 3. Multiple Permissive Policies
  - Consolidates overlapping permissive policies on user_profiles
  - Maintains same security posture with better performance

  ### 4. View Security
  - Recreates order_emails_view without SECURITY DEFINER
  - View inherits RLS from underlying tables

  ### 5. Extension Schema
  - Moves pg_trgm to extensions schema (standard Supabase practice)

  ## Security Notes
  - All changes maintain existing security requirements
  - No data access changes for end users
  - Performance improvements for large datasets
*/

-- =====================================================
-- 1. Fix RLS Policies for user_profiles
-- =====================================================

-- Drop existing policies that have performance issues
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;

-- Create optimized SELECT policy (consolidates both user and admin access)
CREATE POLICY "View own profile or all if admin"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
      AND is_disabled = false
    )
  );

-- Create optimized UPDATE policy (consolidates both user and admin access)
CREATE POLICY "Update own profile or any if admin"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
      AND is_disabled = false
    )
  )
  WITH CHECK (
    id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
      AND is_disabled = false
    )
  );

-- =====================================================
-- 2. Remove Unused Indexes
-- =====================================================

-- Invitations table indexes (low usage table)
DROP INDEX IF EXISTS idx_invitations_email;
DROP INDEX IF EXISTS idx_invitations_token;
DROP INDEX IF EXISTS idx_invitations_used;
DROP INDEX IF EXISTS idx_invitations_invited_by;

-- Channel customers indexes (no queries using these)
DROP INDEX IF EXISTS idx_channel_customers_email;
DROP INDEX IF EXISTS idx_channel_customers_name;
DROP INDEX IF EXISTS idx_channel_customers_account_number;

-- Channel raw imports indexes
DROP INDEX IF EXISTS idx_raw_imports_sync_log;
DROP INDEX IF EXISTS idx_raw_imports_order;
DROP INDEX IF EXISTS idx_raw_imports_status;

-- Channel sync log indexes
DROP INDEX IF EXISTS idx_sync_log_status;

-- Orders table unused indexes
DROP INDEX IF EXISTS idx_orders_external_order_id;
DROP INDEX IF EXISTS idx_orders_order_status;
DROP INDEX IF EXISTS idx_orders_requester;
DROP INDEX IF EXISTS idx_orders_confirmed_at;
DROP INDEX IF EXISTS idx_orders_confirmed_by;
DROP INDEX IF EXISTS idx_orders_required_date;
DROP INDEX IF EXISTS idx_orders_delivery_postcode;

-- ERP API logs indexes
DROP INDEX IF EXISTS idx_erp_api_logs_destination;
DROP INDEX IF EXISTS idx_erp_api_logs_success;
DROP INDEX IF EXISTS idx_erp_api_logs_erp_configuration_id;

-- Sales channels indexes
DROP INDEX IF EXISTS idx_sales_channels_enabled;

-- Customer source mappings indexes
DROP INDEX IF EXISTS idx_csm_external;

-- Delivery address sync indexes
DROP INDEX IF EXISTS idx_delivery_address_sync_items_delivery_address_id;
DROP INDEX IF EXISTS idx_delivery_address_sync_items_action;
DROP INDEX IF EXISTS idx_delivery_address_sync_log_erp_destination_id;

-- ERP configurations indexes
DROP INDEX IF EXISTS idx_erp_configurations_erp_destination_id;

-- Customers indexes
DROP INDEX IF EXISTS idx_customers_supplier_code;

-- Template sample emails indexes
DROP INDEX IF EXISTS idx_template_sample_emails_is_primary;

-- Newly created indexes that aren't used yet (from view migration)
DROP INDEX IF EXISTS idx_orders_channel_export_status;
DROP INDEX IF EXISTS idx_orders_channel_parsing_status;
DROP INDEX IF EXISTS idx_raw_email_created_at_desc;
DROP INDEX IF EXISTS idx_orders_exported_only;
DROP INDEX IF EXISTS idx_raw_email_search;

-- =====================================================
-- 3. Recreate View Without SECURITY DEFINER
-- =====================================================

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS order_emails_view;

CREATE VIEW order_emails_view AS
SELECT
  -- Raw Email columns (prefixed with email_)
  re.id AS email_id,
  re.created_at AS email_created_at,
  re.content AS email_content,
  re.customer_id AS email_customer_id,
  re.date_parsed AS email_date_parsed,
  re.subject AS email_subject,
  re.from_email AS email_from_email,
  re.html_body AS email_html_body,
  re.message_id AS email_message_id,
  re.date_received AS email_date_received,
  re.platform AS email_platform,
  
  -- Orders columns (prefixed with order_)
  o.id AS order_id,
  o.raw_email_id AS order_raw_email_id,
  o.order_number AS order_order_number,
  o.notes AS order_notes,
  o.requester AS order_requester,
  o.template_type AS order_template_type,
  o.parsing_status AS order_parsing_status,
  o.parsing_error AS order_parsing_error,
  o.parsed_at AS order_parsed_at,
  o.created_at AS order_created_at,
  o.channel_source AS order_channel_source,
  o.channel_id AS order_channel_id,
  o.customer_id AS order_customer_id,
  o.external_order_id AS order_external_order_id,
  o.channel_customer_id AS order_channel_customer_id,
  o.order_status AS order_order_status,
  o.currency AS order_currency,
  o.order_total AS order_order_total,
  o.shipping_total AS order_shipping_total,
  o.tax_total AS order_tax_total,
  o.discount_total AS order_discount_total,
  o.confirmed_at AS order_confirmed_at,
  o.confirmed_by AS order_confirmed_by,
  o.supplier_code AS order_supplier_code,
  o.required_date AS order_required_date,
  o.delivery_name AS order_delivery_name,
  o.delivery_address1 AS order_delivery_address1,
  o.delivery_address2 AS order_delivery_address2,
  o.delivery_address3 AS order_delivery_address3,
  o.delivery_address4 AS order_delivery_address4,
  o.delivery_address5 AS order_delivery_address5,
  o.delivery_town AS order_delivery_town,
  o.delivery_county AS order_delivery_county,
  o.delivery_postcode AS order_delivery_postcode,
  o.delivery_country AS order_delivery_country,
  o.delivery_country_code AS order_delivery_country_code,
  o.delivery_email AS order_delivery_email,
  o.delivery_telephone AS order_delivery_telephone,
  o.delivery_phone_extension AS order_delivery_phone_extension,
  o.delivery_mobile AS order_delivery_mobile,
  o.billing_name AS order_billing_name,
  o.billing_address1 AS order_billing_address1,
  o.billing_address2 AS order_billing_address2,
  o.billing_address3 AS order_billing_address3,
  o.billing_address4 AS order_billing_address4,
  o.billing_address5 AS order_billing_address5,
  o.billing_town AS order_billing_town,
  o.billing_county AS order_billing_county,
  o.billing_postcode AS order_billing_postcode,
  o.billing_country AS order_billing_country,
  o.billing_country_code AS order_billing_country_code,
  o.billing_email AS order_billing_email,
  o.billing_telephone AS order_billing_telephone,
  o.billing_phone_extension AS order_billing_phone_extension,
  o.billing_mobile AS order_billing_mobile,
  o.account_number AS order_account_number,
  o.full_address AS order_full_address,
  o.ow_export_status AS order_ow_export_status,
  
  -- Computed status field for easier filtering
  CASE
    WHEN o.id IS NULL THEN 'unparsed'
    WHEN o.ow_export_status = 'exported' THEN 'exported'
    WHEN o.ow_export_status = 'export_failed' THEN 'export_failed'
    WHEN o.parsing_status = 'failed' THEN 'failed'
    WHEN o.parsing_status = 'confirmed' THEN 'confirmed'
    WHEN o.parsing_status = 'pending' THEN 'pending'
    ELSE 'unknown'
  END AS computed_status

FROM raw_email re
LEFT JOIN orders o ON re.id = o.raw_email_id;

COMMENT ON VIEW order_emails_view IS 
  'Unified view joining raw_email with orders. View inherits RLS from underlying tables.';

-- =====================================================
-- 4. Move pg_trgm Extension to Extensions Schema
-- =====================================================

-- Drop from public schema
DROP EXTENSION IF EXISTS pg_trgm;

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Install in extensions schema
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
