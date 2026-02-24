/*
  # Create channel_customers table

  ## Overview
  Creates a dedicated table for customers sourced from sales channels (e.g. WooCommerce).
  When an order is synced from WooCommerce, the system will automatically create or update
  a channel_customers record for the customer on that order. This is separate from the
  existing customers table which is used for Orderwise ERP customers.

  ## New Tables

  ### channel_customers
  Stores customers as imported from sales channels. One record per unique customer
  per channel, keyed by the external ID from the source system.

  - `id` (uuid, PK) - internal identifier
  - `channel_id` (uuid, FK to sales_channels) - which channel this customer came from
  - `external_id` (text) - the customer ID in the source system (e.g. WooCommerce customer ID)
  - `name` (text) - full name
  - `email` (text, nullable) - email address
  - `phone` (text, nullable) - phone number
  - `company` (text, nullable) - company name
  - Billing address fields: billing_name, billing_address1-3, billing_town, billing_county,
    billing_postcode, billing_country, billing_country_code, billing_email, billing_telephone
  - Shipping address fields: shipping_name, shipping_address1-3, shipping_town, shipping_county,
    shipping_postcode, shipping_country, shipping_country_code, shipping_email, shipping_telephone
  - `metadata` (jsonb) - channel-specific extra data
  - `created_at`, `updated_at` (timestamptz)

  ## New Columns

  ### orders table
  - `channel_customer_id` (uuid, nullable, FK to channel_customers) - links a channel-sourced
    order to its channel customer record. Separate from the existing `customer_id` which links
    to Orderwise ERP customers.

  ## Security
  - RLS enabled on channel_customers
  - Admins (admin, super_admin) have full CRUD access
  - Authenticated users have read access

  ## Indexes
  - Unique index on (channel_id, external_id) to prevent duplicate customers per channel
  - Index on email for fast lookups
  - Index on orders.channel_customer_id for join performance
*/

-- ============================================================
-- 1. channel_customers table
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  email text,
  phone text,
  company text,
  billing_name text,
  billing_address1 text,
  billing_address2 text,
  billing_address3 text,
  billing_town text,
  billing_county text,
  billing_postcode text,
  billing_country text,
  billing_country_code text,
  billing_email text,
  billing_telephone text,
  shipping_name text,
  shipping_address1 text,
  shipping_address2 text,
  shipping_address3 text,
  shipping_town text,
  shipping_county text,
  shipping_postcode text,
  shipping_country text,
  shipping_country_code text,
  shipping_email text,
  shipping_telephone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_customers_channel_external
  ON channel_customers(channel_id, external_id);

CREATE INDEX IF NOT EXISTS idx_channel_customers_email
  ON channel_customers(email);

CREATE INDEX IF NOT EXISTS idx_channel_customers_name
  ON channel_customers(name);

ALTER TABLE channel_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view channel customers"
  ON channel_customers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view channel customers"
  ON channel_customers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'user'
    )
  );

CREATE POLICY "Admins can insert channel customers"
  ON channel_customers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update channel customers"
  ON channel_customers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete channel customers"
  ON channel_customers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_channel_customers_updated_at') THEN
    CREATE TRIGGER update_channel_customers_updated_at
      BEFORE UPDATE ON channel_customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- 2. Add channel_customer_id to orders
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'channel_customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN channel_customer_id uuid REFERENCES channel_customers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_channel_customer_id ON orders(channel_customer_id);
