/*
  # Add Orderwise ID column to customers table

  1. Changes
    - Add nullable `orderwise_id` column (integer) to `customers` table
    - This stores the numeric ID from Orderwise API for use in delivery address sync
    - Create index on `orderwise_id` for efficient lookups

  2. Purpose
    - The Orderwise API requires the numeric customer ID for delivery address endpoints
    - Previously the system was incorrectly using the account_number (string) which caused 400 errors
*/

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS orderwise_id integer;

CREATE INDEX IF NOT EXISTS idx_customers_orderwise_id ON customers(orderwise_id);
