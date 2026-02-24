/*
  # Add Orderwise-specific customer fields and last_amended_at for delta sync

  ## Overview
  Extends the customers table with dedicated columns for all Orderwise ERP fields
  that were previously stored only in the metadata JSON blob. Adds a last_amended_at
  timestamp column to enable delta (incremental) sync - only customers updated in
  Orderwise after the last import are re-processed.

  ## Changes Made

  ### 1. Customers Table - New Dedicated Columns

  #### Billing address fields (Orderwise invoice* prefix)
    - `billing_name` (text, nullable) - invoice contact name
    - `billing_address1` (text, nullable) - invoice address line 1
    - `billing_address2` (text, nullable) - invoice address line 2
    - `billing_address3` (text, nullable) - invoice address line 3
    - `billing_town` (text, nullable) - invoice town/city
    - `billing_county` (text, nullable) - invoice county/state
    - `billing_postcode` (text, nullable) - invoice postcode/zip
    - `billing_country` (text, nullable) - invoice country name
    - `billing_country_code` (text, nullable) - invoice country ISO code
    - `billing_email` (text, nullable) - invoice email address
    - `billing_telephone` (text, nullable) - invoice telephone number

  #### Shipping address fields (Orderwise statement* / delivery* prefix)
    - `shipping_name` (text, nullable) - delivery contact name
    - `shipping_address1` (text, nullable) - delivery address line 1
    - `shipping_address2` (text, nullable) - delivery address line 2
    - `shipping_address3` (text, nullable) - delivery address line 3
    - `shipping_town` (text, nullable) - delivery town/city
    - `shipping_county` (text, nullable) - delivery county/state
    - `shipping_postcode` (text, nullable) - delivery postcode/zip
    - `shipping_country` (text, nullable) - delivery country name
    - `shipping_country_code` (text, nullable) - delivery country ISO code
    - `shipping_email` (text, nullable) - delivery email address
    - `shipping_telephone` (text, nullable) - delivery telephone number

  #### Financial / status fields
    - `on_hold` (boolean, default false) - whether customer account is on hold
    - `manual_on_hold` (boolean, default false) - whether manually placed on hold
    - `balance` (numeric, nullable) - current account balance
    - `credit_limit` (numeric, nullable) - credit limit on account
    - `available_to_spend` (numeric, nullable) - remaining credit available
    - `open_orders_value` (numeric, nullable) - total value of open orders
    - `over_credit_terms` (boolean, default false) - whether over credit terms
    - `vat_number` (text, nullable) - VAT registration number
    - `currency_id` (integer, nullable) - Orderwise currency ID
    - `price_list_id` (integer, nullable) - Orderwise price list ID
    - `nominal_code_id` (integer, nullable) - Orderwise nominal code ID
    - `default_tax_code_id` (integer, nullable) - Orderwise default tax code ID

  #### Delta sync field
    - `last_amended_at` (timestamptz, nullable) - stores the Orderwise lastAmendedDateTime
      value verbatim. Used as the basis for incremental sync: the max value across
      all customers for a destination is passed as the filter on the next sync run,
      so only customers amended after that point are fetched and updated.

  ### 2. Indexes
    - Index on `customers.last_amended_at` for efficient delta-sync queries

  ## Notes
    - All new columns are nullable to avoid breaking existing rows
    - shipping_* columns may already exist from a previous migration; those ALTER TABLE
      statements are guarded with IF NOT EXISTS checks
    - The legacy text columns `billing_address` and `shipping_address` are left untouched
      for backwards compatibility
*/

-- Billing address fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_name') THEN
    ALTER TABLE customers ADD COLUMN billing_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_address1') THEN
    ALTER TABLE customers ADD COLUMN billing_address1 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_address2') THEN
    ALTER TABLE customers ADD COLUMN billing_address2 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_address3') THEN
    ALTER TABLE customers ADD COLUMN billing_address3 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_town') THEN
    ALTER TABLE customers ADD COLUMN billing_town text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_county') THEN
    ALTER TABLE customers ADD COLUMN billing_county text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_postcode') THEN
    ALTER TABLE customers ADD COLUMN billing_postcode text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_country') THEN
    ALTER TABLE customers ADD COLUMN billing_country text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_country_code') THEN
    ALTER TABLE customers ADD COLUMN billing_country_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_email') THEN
    ALTER TABLE customers ADD COLUMN billing_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'billing_telephone') THEN
    ALTER TABLE customers ADD COLUMN billing_telephone text;
  END IF;
END $$;

-- Shipping address fields (guarded - may exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_name') THEN
    ALTER TABLE customers ADD COLUMN shipping_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_address1') THEN
    ALTER TABLE customers ADD COLUMN shipping_address1 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_address2') THEN
    ALTER TABLE customers ADD COLUMN shipping_address2 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_address3') THEN
    ALTER TABLE customers ADD COLUMN shipping_address3 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_town') THEN
    ALTER TABLE customers ADD COLUMN shipping_town text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_county') THEN
    ALTER TABLE customers ADD COLUMN shipping_county text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_postcode') THEN
    ALTER TABLE customers ADD COLUMN shipping_postcode text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_country') THEN
    ALTER TABLE customers ADD COLUMN shipping_country text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_country_code') THEN
    ALTER TABLE customers ADD COLUMN shipping_country_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_email') THEN
    ALTER TABLE customers ADD COLUMN shipping_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'shipping_telephone') THEN
    ALTER TABLE customers ADD COLUMN shipping_telephone text;
  END IF;
END $$;

-- Financial / status fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'on_hold') THEN
    ALTER TABLE customers ADD COLUMN on_hold boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'manual_on_hold') THEN
    ALTER TABLE customers ADD COLUMN manual_on_hold boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'balance') THEN
    ALTER TABLE customers ADD COLUMN balance numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'credit_limit') THEN
    ALTER TABLE customers ADD COLUMN credit_limit numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'available_to_spend') THEN
    ALTER TABLE customers ADD COLUMN available_to_spend numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'open_orders_value') THEN
    ALTER TABLE customers ADD COLUMN open_orders_value numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'over_credit_terms') THEN
    ALTER TABLE customers ADD COLUMN over_credit_terms boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'vat_number') THEN
    ALTER TABLE customers ADD COLUMN vat_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'currency_id') THEN
    ALTER TABLE customers ADD COLUMN currency_id integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'price_list_id') THEN
    ALTER TABLE customers ADD COLUMN price_list_id integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'nominal_code_id') THEN
    ALTER TABLE customers ADD COLUMN nominal_code_id integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'default_tax_code_id') THEN
    ALTER TABLE customers ADD COLUMN default_tax_code_id integer;
  END IF;
END $$;

-- Delta sync timestamp field
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_amended_at') THEN
    ALTER TABLE customers ADD COLUMN last_amended_at timestamptz;
  END IF;
END $$;

-- Index for efficient delta-sync queries
CREATE INDEX IF NOT EXISTS idx_customers_last_amended_at ON customers(last_amended_at DESC);
