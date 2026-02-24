/*
  # Add supplier_code to orders table

  1. Changes
    - Add `supplier_code` column to `orders` table (TEXT, nullable)
    - This field will store the supplier's internal code/reference for the order
  
  2. Notes
    - Field is nullable to support existing orders without this data
    - Will be populated during email parsing based on template patterns
*/

-- Add supplier_code column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'supplier_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN supplier_code TEXT;
  END IF;
END $$;
