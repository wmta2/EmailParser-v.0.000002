/*
  # Add supplier_code column to customers table

  1. Changes
    - Add `supplier_code` column to `customers` table
    - This allows matching email orders to customers by their supplier code

  2. Notes
    - Column is nullable as not all customers will have a supplier code
    - Used for matching during email order parsing
*/

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS supplier_code text;

CREATE INDEX IF NOT EXISTS idx_customers_supplier_code ON customers(supplier_code)
WHERE supplier_code IS NOT NULL;