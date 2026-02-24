/*
  # Add Platform Support and Extend Order Items Schema

  ## Overview
  This migration adds platform-based template routing and extends the order_items table
  with additional fields needed for complete line item data capture.

  ## Changes

  1. Add platform column to email_template_patterns table
     - platform (text, nullable) - identifies the source platform (ProcureWizard, Fourth, ZonalConnect, Acquire)
     - null value indicates universal/fallback template

  2. Extend order_items table with new fields
     - size (text) - product size/variant information
     - tax (numeric) - tax amount for line item
     - gross (numeric) - gross amount including tax
     - UOM (text) - unit of measure (e.g., "EA", "CS", "LB")

  3. Add indexes for performance
     - Index on email_template_patterns.platform for filtering

  ## Notes
  - Existing templates will have null platform (universal fallback)
  - Template matching will try platform-specific first, then fall back to universal
  - New order item fields have sensible defaults for backward compatibility
*/

-- Add platform column to email_template_patterns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_template_patterns' AND column_name = 'platform'
  ) THEN
    ALTER TABLE email_template_patterns ADD COLUMN platform text;
  END IF;
END $$;

-- Add new columns to order_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'size'
  ) THEN
    ALTER TABLE order_items ADD COLUMN size text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'tax'
  ) THEN
    ALTER TABLE order_items ADD COLUMN tax numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'gross'
  ) THEN
    ALTER TABLE order_items ADD COLUMN gross numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'uom'
  ) THEN
    ALTER TABLE order_items ADD COLUMN uom text DEFAULT '';
  END IF;
END $$;

-- Create index on platform for faster filtering
CREATE INDEX IF NOT EXISTS idx_template_patterns_platform ON email_template_patterns(platform);

-- Add comment to explain platform field usage
COMMENT ON COLUMN email_template_patterns.platform IS 'Source platform identifier (ProcureWizard, Fourth, ZonalConnect, Acquire). NULL indicates universal/fallback template.';
COMMENT ON COLUMN order_items.size IS 'Product size or variant information';
COMMENT ON COLUMN order_items.tax IS 'Tax amount for this line item';
COMMENT ON COLUMN order_items.gross IS 'Gross amount including tax';
COMMENT ON COLUMN order_items.uom IS 'Unit of measure (e.g., EA, CS, LB, KG)';