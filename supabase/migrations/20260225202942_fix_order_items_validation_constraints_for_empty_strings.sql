/*
  # Fix validation constraints to handle empty strings properly

  1. Changes
    - Drop existing constraints
    - Update constraint logic to allow empty strings OR NULL
    - Empty strings and NULL are both acceptable, but strings with content must be valid
    - This aligns with the existing default values of ''::text

  2. Purpose
    - Allow the existing default value of empty string
    - Only validate non-empty strings to ensure they don't contain newlines or excessive whitespace
*/

-- Drop existing constraints
ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS order_items_product_code_no_newlines;

ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS order_items_sku_no_newlines;

-- Re-add constraints that allow empty strings
ALTER TABLE order_items
ADD CONSTRAINT order_items_product_code_no_newlines
CHECK (
  product_code IS NULL
  OR length(trim(product_code)) = 0
  OR (
    product_code !~ '[\r\n]'
    AND product_code !~ '\s{2,}'
  )
);

ALTER TABLE order_items
ADD CONSTRAINT order_items_sku_no_newlines
CHECK (
  sku IS NULL
  OR length(trim(sku)) = 0
  OR (
    sku !~ '[\r\n]'
    AND sku !~ '\s{2,}'
  )
);

-- Add comment explaining the constraints
COMMENT ON CONSTRAINT order_items_product_code_no_newlines ON order_items IS
'Ensures product_code does not contain newlines or excessive whitespace (allows NULL and empty strings)';

COMMENT ON CONSTRAINT order_items_sku_no_newlines ON order_items IS
'Ensures sku does not contain newlines or excessive whitespace (allows NULL and empty strings)';