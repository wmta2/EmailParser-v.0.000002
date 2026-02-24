/*
  # Alter Email Template Patterns Table Structure

  ## Overview
  This migration updates the email_template_patterns table from a simple structure
  with generic JSONB fields to a detailed structure with specific columns for each pattern type.

  ## Changes
  
  1. Add new columns for detailed template configuration:
     - provider_name
     - detection_keywords (replaces detection_patterns)
     - confidence_threshold
     - order_number_pattern
     - delivery_address_pattern
     - billing_address_pattern
     - notes_pattern
     - requester_pattern
     - table_header_keywords
     - column_mapping (replaces parsing_rules)
  
  2. Drop old generic JSONB columns:
     - detection_patterns (replaced by detection_keywords)
     - parsing_rules (replaced by column_mapping)
  
  3. Update existing template data to new format
  
  ## Notes
  
  - Existing templates will be migrated to the new structure
  - Priority values are preserved
  - Active status is preserved
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'provider_name') THEN
    ALTER TABLE email_template_patterns ADD COLUMN provider_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'detection_keywords') THEN
    ALTER TABLE email_template_patterns ADD COLUMN detection_keywords jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'confidence_threshold') THEN
    ALTER TABLE email_template_patterns ADD COLUMN confidence_threshold integer DEFAULT 50 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'order_number_pattern') THEN
    ALTER TABLE email_template_patterns ADD COLUMN order_number_pattern jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'delivery_address_pattern') THEN
    ALTER TABLE email_template_patterns ADD COLUMN delivery_address_pattern jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'billing_address_pattern') THEN
    ALTER TABLE email_template_patterns ADD COLUMN billing_address_pattern jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'notes_pattern') THEN
    ALTER TABLE email_template_patterns ADD COLUMN notes_pattern jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'requester_pattern') THEN
    ALTER TABLE email_template_patterns ADD COLUMN requester_pattern jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'table_header_keywords') THEN
    ALTER TABLE email_template_patterns ADD COLUMN table_header_keywords jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_template_patterns' AND column_name = 'column_mapping') THEN
    ALTER TABLE email_template_patterns ADD COLUMN column_mapping jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update existing templates to new format
UPDATE email_template_patterns
SET
  provider_name = CASE
    WHEN template_type = 'template_1' THEN 'Generic Order System'
    WHEN template_type = 'template_2' THEN 'Generic Invoice System'
    ELSE 'Unknown Provider'
  END,
  detection_keywords = CASE
    WHEN template_type = 'template_1' THEN '["order number", "delivery address", "product code", "unit price"]'::jsonb
    WHEN template_type = 'template_2' THEN '["invoice", "ship to", "item #", "qty"]'::jsonb
    ELSE '[]'::jsonb
  END,
  confidence_threshold = 25,
  order_number_pattern = CASE
    WHEN template_type = 'template_1' THEN '{"start": "order\\s*(?:number|#|no\\.?)[\\s:]+", "end": "[\\n\\r]|delivery"}'::jsonb
    WHEN template_type = 'template_2' THEN '{"start": "(?:invoice|order)\\s*(?:number|#|no\\.?)[\\s:]+", "end": "[\\n\\r]|ship"}'::jsonb
    ELSE NULL
  END,
  delivery_address_pattern = CASE
    WHEN template_type = 'template_1' THEN '{"start": "delivery\\s*address[\\s:]+", "end": "billing|notes|product"}'::jsonb
    WHEN template_type = 'template_2' THEN '{"start": "ship\\s*to[\\s:]+", "end": "bill|note|item"}'::jsonb
    ELSE NULL
  END,
  billing_address_pattern = CASE
    WHEN template_type = 'template_1' THEN '{"start": "billing\\s*address[\\s:]+", "end": "notes|product|order"}'::jsonb
    WHEN template_type = 'template_2' THEN '{"start": "bill\\s*to[\\s:]+", "end": "note|item|total"}'::jsonb
    ELSE NULL
  END,
  notes_pattern = CASE
    WHEN template_type = 'template_1' THEN '{"start": "notes[\\s:]+", "end": "product|item|total"}'::jsonb
    WHEN template_type = 'template_2' THEN '{"start": "(?:notes|comments)[\\s:]+", "end": "item|total|subtotal"}'::jsonb
    ELSE NULL
  END,
  requester_pattern = CASE
    WHEN template_type = 'template_1' THEN '{"start": "(?:restaurant|requester|from)[\\s:]+", "end": "[\\n\\r]|order"}'::jsonb
    WHEN template_type = 'template_2' THEN '{"start": "(?:from|customer)[\\s:]+", "end": "[\\n\\r]|invoice"}'::jsonb
    ELSE NULL
  END,
  table_header_keywords = CASE
    WHEN template_type = 'template_1' THEN '["product", "item", "code"]'::jsonb
    WHEN template_type = 'template_2' THEN '["item", "description", "qty"]'::jsonb
    ELSE '[]'::jsonb
  END,
  column_mapping = '{"0": "product_code", "1": "product_name", "2": "quantity", "3": "unit_price", "4": "total"}'::jsonb,
  template_name = CASE
    WHEN template_type = 'template_1' THEN 'Standard Order Format'
    WHEN template_type = 'template_2' THEN 'Invoice Format'
    ELSE template_name
  END
WHERE template_type IN ('template_1', 'template_2');

-- Set NOT NULL constraints on new required columns
ALTER TABLE email_template_patterns ALTER COLUMN provider_name SET NOT NULL;
ALTER TABLE email_template_patterns ALTER COLUMN detection_keywords SET NOT NULL;
ALTER TABLE email_template_patterns ALTER COLUMN table_header_keywords SET NOT NULL;
ALTER TABLE email_template_patterns ALTER COLUMN column_mapping SET NOT NULL;
ALTER TABLE email_template_patterns ALTER COLUMN confidence_threshold SET NOT NULL;

-- Drop old columns
ALTER TABLE email_template_patterns DROP COLUMN IF EXISTS detection_patterns;
ALTER TABLE email_template_patterns DROP COLUMN IF EXISTS parsing_rules;

-- Recreate indexes if needed
CREATE INDEX IF NOT EXISTS idx_template_patterns_active ON email_template_patterns(active);
CREATE INDEX IF NOT EXISTS idx_template_patterns_priority ON email_template_patterns(priority DESC);
CREATE INDEX IF NOT EXISTS idx_template_patterns_type ON email_template_patterns(template_type);