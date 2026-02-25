/*
  # Clean existing data and add validation constraints for order_items

  1. Data Cleanup
    - Clean product_code and sku fields that contain newlines or excessive whitespace
    - Set invalid values to NULL rather than deleting rows

  2. Constraints Added
    - CHECK constraint on product_code to reject values with newlines or excessive whitespace
    - CHECK constraint on sku to reject values with newlines or excessive whitespace
    - Ensures data quality at the database level

  3. Purpose
    - Fix existing invalid data like "Add code\n                  \n                  \n                   !"
    - Prevent future invalid data from being saved
    - Provide ultimate safety net for data validation
*/

-- Clean existing product_code values that contain newlines or excessive whitespace
UPDATE order_items
SET product_code = NULL
WHERE product_code IS NOT NULL
  AND (
    product_code ~ '[\r\n]'
    OR product_code ~ '\s{2,}'
    OR length(trim(product_code)) = 0
  );

-- Clean existing sku values that contain newlines or excessive whitespace
UPDATE order_items
SET sku = NULL
WHERE sku IS NOT NULL
  AND (
    sku ~ '[\r\n]'
    OR sku ~ '\s{2,}'
    OR length(trim(sku)) = 0
  );

-- Add CHECK constraint for product_code
-- Reject values containing newlines, carriage returns, or multiple consecutive spaces
ALTER TABLE order_items
ADD CONSTRAINT order_items_product_code_no_newlines
CHECK (
  product_code IS NULL
  OR (
    product_code !~ '[\r\n]'
    AND product_code !~ '\s{2,}'
    AND length(trim(product_code)) > 0
  )
);

-- Add CHECK constraint for sku
-- Reject values containing newlines, carriage returns, or multiple consecutive spaces
ALTER TABLE order_items
ADD CONSTRAINT order_items_sku_no_newlines
CHECK (
  sku IS NULL
  OR (
    sku !~ '[\r\n]'
    AND sku !~ '\s{2,}'
    AND length(trim(sku)) > 0
  )
);

-- Add comment explaining the constraints
COMMENT ON CONSTRAINT order_items_product_code_no_newlines ON order_items IS
'Ensures product_code does not contain newlines or excessive whitespace';

COMMENT ON CONSTRAINT order_items_sku_no_newlines ON order_items IS
'Ensures sku does not contain newlines or excessive whitespace';