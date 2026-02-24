/*
  # Add Structured Address Fields and Delivery Date

  ## Overview
  This migration restructures the address storage from single text fields to individual
  components matching OrderWise API requirements. This eliminates fragile string parsing
  at export time and improves data quality.

  ## Changes to Orders Table
  
  ### New Fields:
  - `required_date` - Delivery date extracted from emails or set manually
  
  ### Structured Delivery Address (15 new fields):
  - `delivery_name` - Recipient name
  - `delivery_address1` - First line of address
  - `delivery_address2` - Second line of address
  - `delivery_address3` - Third line of address
  - `delivery_town` - City/Town
  - `delivery_county` - County/State
  - `delivery_postcode` - Postal/ZIP code
  - `delivery_country` - Country name
  - `delivery_country_code` - ISO country code
  - `delivery_email` - Delivery contact email
  - `delivery_telephone` - Delivery contact phone
  - `delivery_address4` - Fourth line (additional field)
  - `delivery_address5` - Fifth line (additional field)
  - `delivery_phone_extension` - Phone extension
  - `delivery_mobile` - Mobile phone number
  
  ### Structured Billing Address (15 new fields):
  - `billing_name` - Billing contact name
  - `billing_address1` through `billing_address5`
  - `billing_town`, `billing_county`, `billing_postcode`
  - `billing_country`, `billing_country_code`
  - `billing_email`, `billing_telephone`
  - `billing_phone_extension`, `billing_mobile`
  
  ### Legacy Fields (retained temporarily):
  - `delivery_address` - Original single-field address (will be removed after migration verification)
  - `billing_address` - Original single-field address (will be removed after migration verification)

  ## Changes to Customers Table
  
  ### Structured Billing Address (11 new fields):
  - `billing_name`, `billing_address1`, `billing_address2`, `billing_address3`
  - `billing_town`, `billing_county`, `billing_postcode`
  - `billing_country`, `billing_country_code`
  - `billing_email`, `billing_telephone`
  
  ### Structured Shipping Address (11 new fields):
  - `shipping_name`, `shipping_address1`, `shipping_address2`, `shipping_address3`
  - `shipping_town`, `shipping_county`, `shipping_postcode`
  - `shipping_country`, `shipping_country_code`
  - `shipping_email`, `shipping_telephone`
  
  ### Legacy Fields (retained temporarily):
  - `billing_address` - Original text field
  - `shipping_address` - Original text field

  ## Changes to Email Template Patterns Table
  
  ### New Pattern Fields:
  - `required_date_pattern` - JSONB pattern for extracting delivery date
  - `delivery_contact_pattern` - JSONB pattern for delivery contact name
  - `delivery_email_pattern` - JSONB pattern for delivery email
  - `delivery_telephone_pattern` - JSONB pattern for delivery phone
  - `delivery_address1_pattern` through `delivery_address5_pattern` - Individual line patterns
  - `billing_address1_pattern` through `billing_address5_pattern` - Individual line patterns
  - `delivery_town_pattern`, `delivery_county_pattern`, `delivery_postcode_pattern`
  - `billing_town_pattern`, `billing_county_pattern`, `billing_postcode_pattern`

  ## Migration Strategy
  1. Add all new fields as nullable
  2. Keep legacy fields intact for comparison
  3. A separate data migration script will populate structured fields from legacy data
  4. After verification, legacy fields can be removed in a future migration

  ## Security
  - All new fields inherit existing RLS policies from their tables
  - No changes to RLS policies needed as they operate at row level
*/

-- ============================================================================
-- ORDERS TABLE: Add Structured Address Fields and Required Date
-- ============================================================================

-- Add delivery date field
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS required_date timestamptz;

-- Add structured delivery address fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_name text,
ADD COLUMN IF NOT EXISTS delivery_address1 text,
ADD COLUMN IF NOT EXISTS delivery_address2 text,
ADD COLUMN IF NOT EXISTS delivery_address3 text,
ADD COLUMN IF NOT EXISTS delivery_address4 text,
ADD COLUMN IF NOT EXISTS delivery_address5 text,
ADD COLUMN IF NOT EXISTS delivery_town text,
ADD COLUMN IF NOT EXISTS delivery_county text,
ADD COLUMN IF NOT EXISTS delivery_postcode text,
ADD COLUMN IF NOT EXISTS delivery_country text,
ADD COLUMN IF NOT EXISTS delivery_country_code text,
ADD COLUMN IF NOT EXISTS delivery_email text,
ADD COLUMN IF NOT EXISTS delivery_telephone text,
ADD COLUMN IF NOT EXISTS delivery_phone_extension text,
ADD COLUMN IF NOT EXISTS delivery_mobile text;

-- Add structured billing address fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS billing_name text,
ADD COLUMN IF NOT EXISTS billing_address1 text,
ADD COLUMN IF NOT EXISTS billing_address2 text,
ADD COLUMN IF NOT EXISTS billing_address3 text,
ADD COLUMN IF NOT EXISTS billing_address4 text,
ADD COLUMN IF NOT EXISTS billing_address5 text,
ADD COLUMN IF NOT EXISTS billing_town text,
ADD COLUMN IF NOT EXISTS billing_county text,
ADD COLUMN IF NOT EXISTS billing_postcode text,
ADD COLUMN IF NOT EXISTS billing_country text,
ADD COLUMN IF NOT EXISTS billing_country_code text,
ADD COLUMN IF NOT EXISTS billing_email text,
ADD COLUMN IF NOT EXISTS billing_telephone text,
ADD COLUMN IF NOT EXISTS billing_phone_extension text,
ADD COLUMN IF NOT EXISTS billing_mobile text;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_required_date ON orders(required_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_postcode ON orders(delivery_postcode);
CREATE INDEX IF NOT EXISTS idx_orders_billing_postcode ON orders(billing_postcode);

-- ============================================================================
-- CUSTOMERS TABLE: Add Structured Address Fields
-- ============================================================================

-- Add structured billing address fields
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS billing_name text,
ADD COLUMN IF NOT EXISTS billing_address1 text,
ADD COLUMN IF NOT EXISTS billing_address2 text,
ADD COLUMN IF NOT EXISTS billing_address3 text,
ADD COLUMN IF NOT EXISTS billing_town text,
ADD COLUMN IF NOT EXISTS billing_county text,
ADD COLUMN IF NOT EXISTS billing_postcode text,
ADD COLUMN IF NOT EXISTS billing_country text,
ADD COLUMN IF NOT EXISTS billing_country_code text,
ADD COLUMN IF NOT EXISTS billing_email text,
ADD COLUMN IF NOT EXISTS billing_telephone text;

-- Add structured shipping address fields  
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS shipping_name text,
ADD COLUMN IF NOT EXISTS shipping_address1 text,
ADD COLUMN IF NOT EXISTS shipping_address2 text,
ADD COLUMN IF NOT EXISTS shipping_address3 text,
ADD COLUMN IF NOT EXISTS shipping_town text,
ADD COLUMN IF NOT EXISTS shipping_county text,
ADD COLUMN IF NOT EXISTS shipping_postcode text,
ADD COLUMN IF NOT EXISTS shipping_country text,
ADD COLUMN IF NOT EXISTS shipping_country_code text,
ADD COLUMN IF NOT EXISTS shipping_email text,
ADD COLUMN IF NOT EXISTS shipping_telephone text;

-- Add indexes for customer searches
CREATE INDEX IF NOT EXISTS idx_customers_billing_postcode ON customers(billing_postcode);
CREATE INDEX IF NOT EXISTS idx_customers_shipping_postcode ON customers(shipping_postcode);

-- ============================================================================
-- EMAIL TEMPLATE PATTERNS TABLE: Add Pattern Fields for Structured Extraction
-- ============================================================================

-- Add pattern fields for delivery date and contact information
ALTER TABLE email_template_patterns
ADD COLUMN IF NOT EXISTS required_date_pattern jsonb,
ADD COLUMN IF NOT EXISTS delivery_contact_pattern jsonb,
ADD COLUMN IF NOT EXISTS delivery_email_pattern jsonb,
ADD COLUMN IF NOT EXISTS delivery_telephone_pattern jsonb;

-- Add pattern fields for structured delivery address components
ALTER TABLE email_template_patterns
ADD COLUMN IF NOT EXISTS delivery_address1_pattern jsonb,
ADD COLUMN IF NOT EXISTS delivery_address2_pattern jsonb,
ADD COLUMN IF NOT EXISTS delivery_address3_pattern jsonb,
ADD COLUMN IF NOT EXISTS delivery_town_pattern jsonb,
ADD COLUMN IF NOT EXISTS delivery_county_pattern jsonb,
ADD COLUMN IF NOT EXISTS delivery_postcode_pattern jsonb,
ADD COLUMN IF NOT EXISTS delivery_country_pattern jsonb;

-- Add pattern fields for structured billing address components
ALTER TABLE email_template_patterns
ADD COLUMN IF NOT EXISTS billing_contact_pattern jsonb,
ADD COLUMN IF NOT EXISTS billing_address1_pattern jsonb,
ADD COLUMN IF NOT EXISTS billing_address2_pattern jsonb,
ADD COLUMN IF NOT EXISTS billing_address3_pattern jsonb,
ADD COLUMN IF NOT EXISTS billing_town_pattern jsonb,
ADD COLUMN IF NOT EXISTS billing_county_pattern jsonb,
ADD COLUMN IF NOT EXISTS billing_postcode_pattern jsonb,
ADD COLUMN IF NOT EXISTS billing_country_pattern jsonb;

-- ============================================================================
-- COMMENTS ON NEW FIELDS
-- ============================================================================

COMMENT ON COLUMN orders.required_date IS 'Requested delivery date extracted from email or set manually';
COMMENT ON COLUMN orders.delivery_name IS 'Delivery contact name';
COMMENT ON COLUMN orders.delivery_address1 IS 'First line of delivery address';
COMMENT ON COLUMN orders.billing_name IS 'Billing contact name';
COMMENT ON COLUMN orders.billing_address1 IS 'First line of billing address';

COMMENT ON COLUMN customers.billing_name IS 'Primary billing contact name';
COMMENT ON COLUMN customers.shipping_name IS 'Primary shipping contact name';

COMMENT ON COLUMN email_template_patterns.required_date_pattern IS 'Pattern to extract delivery date from email';
COMMENT ON COLUMN email_template_patterns.delivery_contact_pattern IS 'Pattern to extract delivery contact name';
