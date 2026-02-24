/*
  # Remove Legacy Address Fields

  ## Overview
  This migration removes the legacy single-field address columns that have been
  replaced by structured address components. The structured fields were added in
  migration 20260212171952 and data was migrated in 20260212172200.

  ## Changes

  ### Orders Table - Remove Legacy Fields:
  - Drop `delivery_address` column (replaced by delivery_name, delivery_address1-5, etc.)
  - Drop `billing_address` column (replaced by billing_name, billing_address1-5, etc.)

  ### Customers Table - Remove Legacy Fields:
  - Drop `billing_address` column (replaced by structured billing fields)
  - Drop `shipping_address` column (replaced by structured shipping fields)

  ### Email Template Patterns Table - Remove Legacy Pattern Fields:
  - Drop `delivery_address_pattern` column (replaced by individual field patterns)
  - Drop `billing_address_pattern` column (replaced by individual field patterns)

  ## Rationale
  The legacy single-field address approach required fragile string parsing at export time.
  The new structured approach captures address components directly from email patterns,
  ensuring consistent data quality for ERP integrations and eliminating 1000+ lines of
  parsing logic and technical debt.

  ## Security
  - No RLS policy changes needed (policies operate at row level)
  - All structured address fields retain existing RLS protection
*/

-- ============================================================================
-- ORDERS TABLE: Remove Legacy Address Fields
-- ============================================================================

-- Drop legacy delivery and billing address columns
ALTER TABLE orders
DROP COLUMN IF EXISTS delivery_address,
DROP COLUMN IF EXISTS billing_address;

-- ============================================================================
-- CUSTOMERS TABLE: Remove Legacy Address Fields
-- ============================================================================

-- Drop legacy billing and shipping address columns
ALTER TABLE customers
DROP COLUMN IF EXISTS billing_address,
DROP COLUMN IF EXISTS shipping_address;

-- ============================================================================
-- EMAIL TEMPLATE PATTERNS TABLE: Remove Legacy Pattern Fields
-- ============================================================================

-- Drop legacy address pattern columns
ALTER TABLE email_template_patterns
DROP COLUMN IF EXISTS delivery_address_pattern,
DROP COLUMN IF EXISTS billing_address_pattern;