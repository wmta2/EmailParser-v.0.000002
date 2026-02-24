/*
  # Add Import Account Number and Full Address to Orders

  1. Changes
    - Add `account_number` column to `orders` table
      - Type: text (nullable)
      - Purpose: Store import account numbers extracted from emails via XPath
    - Add `full_address` column to `orders` table
      - Type: text (nullable)
      - Purpose: Store complete address blocks captured as single text from emails via XPath
      - Use case: When addresses aren't in structured fields but in a single block

  2. Notes
    - Both fields are optional and support XPath-based extraction
    - These fields complement existing structured address fields
    - full_address is useful for emails with non-standard address formatting
    - account_number helps identify customer accounts for import processing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN account_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'full_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN full_address text;
  END IF;
END $$;
