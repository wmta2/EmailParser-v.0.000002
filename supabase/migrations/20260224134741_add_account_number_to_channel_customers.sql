/*
  # Add account_number column to channel_customers table

  1. Schema Changes
    - Add `account_number` column to `channel_customers` table
    - This allows storing and matching customers by account number across channels

  2. Purpose
    - Enable matching incoming orders to customers by account number
    - Aligns channel_customers with the main customers table structure
*/

ALTER TABLE channel_customers
ADD COLUMN IF NOT EXISTS account_number text;

CREATE INDEX IF NOT EXISTS idx_channel_customers_account_number 
ON channel_customers (account_number) 
WHERE account_number IS NOT NULL;
