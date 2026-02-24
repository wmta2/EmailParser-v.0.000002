/*
  # Remove Regex Patterns - Migrate to XPath-Only Parsing

  ## Overview
  This migration removes all legacy regex pattern columns from the email_template_patterns
  table and consolidates the system to use only XPath-based DOM parsing.

  ## Changes Made

  1. **Removed Columns** - All legacy regex pattern columns:
    - Basic order fields: order_number_pattern, notes_pattern, requester_pattern, supplier_code_pattern, required_date_pattern
    - Delivery address patterns: delivery_contact_pattern, delivery_email_pattern, delivery_telephone_pattern, 
      delivery_address1_pattern, delivery_address2_pattern, delivery_address3_pattern, delivery_town_pattern, 
      delivery_county_pattern, delivery_postcode_pattern, delivery_country_pattern
    - Billing address patterns: billing_contact_pattern, billing_address1_pattern, billing_address2_pattern, 
      billing_address3_pattern, billing_town_pattern, billing_county_pattern, billing_postcode_pattern, 
      billing_country_pattern
    - parsing_method column (no longer needed as only DOM/XPath parsing is supported)

  2. **Required Fields**
    - dom_config is now required (NOT NULL) as it's the only parsing method

  3. **Documentation Updates**
    - Updated column comments to reflect XPath-only approach
    - Removed references to legacy regex parsing

  ## Important Notes
  - All templates must have dom_config defined before running this migration
  - Regex pattern-based templates are no longer supported
  - All email parsing will use XPath selectors from dom_config
*/

-- First, ensure all existing templates have a dom_config (set empty object if null)
UPDATE email_template_patterns 
SET dom_config = '{}'::jsonb 
WHERE dom_config IS NULL;

-- Drop all regex pattern columns
ALTER TABLE email_template_patterns 
  DROP COLUMN IF EXISTS order_number_pattern,
  DROP COLUMN IF EXISTS notes_pattern,
  DROP COLUMN IF EXISTS requester_pattern,
  DROP COLUMN IF EXISTS supplier_code_pattern,
  DROP COLUMN IF EXISTS required_date_pattern,
  DROP COLUMN IF EXISTS delivery_contact_pattern,
  DROP COLUMN IF EXISTS delivery_email_pattern,
  DROP COLUMN IF EXISTS delivery_telephone_pattern,
  DROP COLUMN IF EXISTS delivery_address1_pattern,
  DROP COLUMN IF EXISTS delivery_address2_pattern,
  DROP COLUMN IF EXISTS delivery_address3_pattern,
  DROP COLUMN IF EXISTS delivery_town_pattern,
  DROP COLUMN IF EXISTS delivery_county_pattern,
  DROP COLUMN IF EXISTS delivery_postcode_pattern,
  DROP COLUMN IF EXISTS delivery_country_pattern,
  DROP COLUMN IF EXISTS billing_contact_pattern,
  DROP COLUMN IF EXISTS billing_address1_pattern,
  DROP COLUMN IF EXISTS billing_address2_pattern,
  DROP COLUMN IF EXISTS billing_address3_pattern,
  DROP COLUMN IF EXISTS billing_town_pattern,
  DROP COLUMN IF EXISTS billing_county_pattern,
  DROP COLUMN IF EXISTS billing_postcode_pattern,
  DROP COLUMN IF EXISTS billing_country_pattern,
  DROP COLUMN IF EXISTS parsing_method;

-- Make dom_config required
ALTER TABLE email_template_patterns 
  ALTER COLUMN dom_config SET NOT NULL;

-- Update column comment to reflect XPath-only approach
COMMENT ON COLUMN email_template_patterns.dom_config IS 'XPath configuration for element selection. Contains XPath expressions for extracting order fields, addresses, and line items from HTML emails. This is the only supported parsing method.';

-- Update table comment
COMMENT ON TABLE email_template_patterns IS 'Email template configurations using XPath-based DOM parsing for extracting order information from HTML emails.';
