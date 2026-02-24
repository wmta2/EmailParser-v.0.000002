/*
  # Create Sales Channel Infrastructure Tables

  ## Overview
  This migration creates the foundational tables for a multi-channel order management system.
  It enables importing orders from multiple sales channels (Email, WooCommerce, etc.) into a 
  unified system with full audit trails and raw data preservation.

  ## New Tables

  1. `sales_channels`
     - `id` (uuid, PK) - Unique identifier
     - `name` (text) - Human-readable channel name
     - `slug` (text, unique) - URL-safe identifier (e.g. "email", "woocommerce")
     - `channel_type` (text) - Category of channel
     - `description` (text) - Brief description
     - `icon_name` (text) - Lucide icon name for UI rendering
     - `enabled` (boolean, default false) - Whether the channel is active
     - `priority` (integer, default 0) - Display ordering
     - `created_at` / `updated_at` (timestamptz)

  2. `channel_configurations`
     - `id` (uuid, PK) - Unique identifier
     - `channel_id` (uuid, FK to sales_channels, unique) - One config per channel
     - `config_data` (jsonb) - Non-sensitive settings (URL, polling interval, filters)
     - `credentials` (jsonb) - Sensitive data (API keys, secrets)
     - `last_sync_at` (timestamptz) - Last successful sync time
     - `sync_status` (text) - Current sync state (idle/syncing/error)
     - `created_at` / `updated_at` (timestamptz)

  3. `customers`
     - `id` (uuid, PK) - Unique identifier
     - `external_id` (text, nullable) - ID from originating system
     - `source_channel_id` (uuid, FK to sales_channels) - Which channel created this customer
     - `name` (text) - Customer name
     - `email` (text, nullable) - Email address
     - `phone` (text, nullable) - Phone number
     - `company` (text, nullable) - Company name
     - `billing_address` (text, nullable) - Billing address
     - `shipping_address` (text, nullable) - Shipping address
     - `metadata` (jsonb) - Channel-specific extra data
     - `created_at` / `updated_at` (timestamptz)
     - Unique constraint on (source_channel_id, external_id)

  4. `customer_source_mappings`
     - `id` (uuid, PK) - Unique identifier
     - `customer_id` (uuid, FK to customers) - The customer being mapped
     - `external_system` (text) - Target system name (e.g. "orderwise", "woocommerce")
     - `external_customer_id` (text) - The ID in the external system
     - `mapping_status` (text) - Status of the mapping (pending/mapped/failed)
     - `last_synced_at` (timestamptz, nullable) - Last sync time
     - `metadata` (jsonb) - Extra mapping data
     - `created_at` / `updated_at` (timestamptz)
     - Unique constraint on (customer_id, external_system)

  5. `channel_sync_log`
     - `id` (uuid, PK) - Unique identifier
     - `channel_id` (uuid, FK to sales_channels) - Which channel was synced
     - `sync_type` (text) - How the sync was triggered (manual/scheduled/webhook)
     - `status` (text) - Outcome (started/success/partial/failed)
     - `orders_imported` (integer) - Count of successfully imported orders
     - `orders_skipped` (integer) - Count of skipped orders (duplicates)
     - `orders_failed` (integer) - Count of failed order imports
     - `error_message` (text, nullable) - Top-level error message
     - `error_details` (jsonb, nullable) - Detailed error info (stack traces, failed IDs)
     - `started_at` (timestamptz) - When the sync started
     - `completed_at` (timestamptz, nullable) - When the sync finished
     - `created_at` (timestamptz)

  6. `channel_raw_imports`
     - `id` (uuid, PK) - Unique identifier
     - `channel_id` (uuid, FK to sales_channels) - Source channel
     - `sync_log_id` (uuid, FK to channel_sync_log, nullable) - Which sync produced this
     - `external_id` (text) - The source record ID (WC order ID, email message_id)
     - `raw_data` (jsonb) - Complete untransformed source data
     - `import_status` (text) - Outcome (success/failed/skipped)
     - `error_message` (text, nullable) - Error details if failed
     - `order_id` (uuid, FK to orders, nullable) - Link to created order if successful
     - `created_at` (timestamptz)
     - Unique constraint on (channel_id, external_id)

  ## Security
  - RLS enabled on all tables
  - Super admins and admins have full CRUD access
  - Regular authenticated users have read-only access to channels, customers, and logs

  ## Seed Data
  - Two default channels: "Email Orders" (enabled) and "WooCommerce" (disabled)
*/

-- ============================================================
-- 1. sales_channels
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  channel_type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'Box',
  enabled boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_channels_slug ON sales_channels(slug);
CREATE INDEX IF NOT EXISTS idx_sales_channels_enabled ON sales_channels(enabled);

ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales channels"
  ON sales_channels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert sales channels"
  ON sales_channels FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update sales channels"
  ON sales_channels FOR UPDATE TO authenticated
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

CREATE POLICY "Admins can delete sales channels"
  ON sales_channels FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view enabled channels"
  ON sales_channels FOR SELECT TO authenticated
  USING (enabled = true);

-- ============================================================
-- 2. channel_configurations
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL UNIQUE REFERENCES sales_channels(id) ON DELETE CASCADE,
  config_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  sync_status text NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE channel_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view channel configs"
  ON channel_configurations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert channel configs"
  ON channel_configurations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update channel configs"
  ON channel_configurations FOR UPDATE TO authenticated
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

CREATE POLICY "Admins can delete channel configs"
  ON channel_configurations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 3. customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  source_channel_id uuid REFERENCES sales_channels(id),
  name text NOT NULL DEFAULT '',
  email text,
  phone text,
  company text,
  billing_address text,
  shipping_address text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_channel_external
  ON customers(source_channel_id, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view customers"
  ON customers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'user'
    )
  );

CREATE POLICY "Admins can insert customers"
  ON customers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update customers"
  ON customers FOR UPDATE TO authenticated
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

CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 4. customer_source_mappings
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_source_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_system text NOT NULL,
  external_customer_id text NOT NULL,
  mapping_status text NOT NULL DEFAULT 'pending',
  last_synced_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, external_system)
);

CREATE INDEX IF NOT EXISTS idx_csm_customer ON customer_source_mappings(customer_id);
CREATE INDEX IF NOT EXISTS idx_csm_external ON customer_source_mappings(external_system, external_customer_id);

ALTER TABLE customer_source_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view customer mappings"
  ON customer_source_mappings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view customer mappings"
  ON customer_source_mappings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'user'
    )
  );

CREATE POLICY "Admins can insert customer mappings"
  ON customer_source_mappings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update customer mappings"
  ON customer_source_mappings FOR UPDATE TO authenticated
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

CREATE POLICY "Admins can delete customer mappings"
  ON customer_source_mappings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 5. channel_sync_log
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  sync_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'started',
  orders_imported integer NOT NULL DEFAULT 0,
  orders_skipped integer NOT NULL DEFAULT 0,
  orders_failed integer NOT NULL DEFAULT 0,
  error_message text,
  error_details jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_channel_date ON channel_sync_log(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON channel_sync_log(status);

ALTER TABLE channel_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON channel_sync_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view sync logs"
  ON channel_sync_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'user'
    )
  );

CREATE POLICY "Admins can insert sync logs"
  ON channel_sync_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update sync logs"
  ON channel_sync_log FOR UPDATE TO authenticated
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

-- ============================================================
-- 6. channel_raw_imports
-- ============================================================
CREATE TABLE IF NOT EXISTS channel_raw_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  sync_log_id uuid REFERENCES channel_sync_log(id) ON DELETE SET NULL,
  external_id text NOT NULL,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  import_status text NOT NULL DEFAULT 'success',
  error_message text,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_imports_channel_external
  ON channel_raw_imports(channel_id, external_id);
CREATE INDEX IF NOT EXISTS idx_raw_imports_sync_log ON channel_raw_imports(sync_log_id);
CREATE INDEX IF NOT EXISTS idx_raw_imports_order ON channel_raw_imports(order_id);
CREATE INDEX IF NOT EXISTS idx_raw_imports_status ON channel_raw_imports(import_status);

ALTER TABLE channel_raw_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view raw imports"
  ON channel_raw_imports FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can view raw imports"
  ON channel_raw_imports FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'user'
    )
  );

CREATE POLICY "Admins can insert raw imports"
  ON channel_raw_imports FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update raw imports"
  ON channel_raw_imports FOR UPDATE TO authenticated
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

-- ============================================================
-- 7. Triggers for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_channels_updated_at') THEN
    CREATE TRIGGER update_sales_channels_updated_at
      BEFORE UPDATE ON sales_channels
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_channel_configurations_updated_at') THEN
    CREATE TRIGGER update_channel_configurations_updated_at
      BEFORE UPDATE ON channel_configurations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at') THEN
    CREATE TRIGGER update_customers_updated_at
      BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customer_source_mappings_updated_at') THEN
    CREATE TRIGGER update_customer_source_mappings_updated_at
      BEFORE UPDATE ON customer_source_mappings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- 8. Seed default channels
-- ============================================================
INSERT INTO sales_channels (name, slug, channel_type, description, icon_name, enabled, priority)
VALUES
  ('Email Orders', 'email', 'email', 'Orders imported from email parsing', 'Mail', true, 10),
  ('WooCommerce', 'woocommerce', 'api', 'Orders synced from WooCommerce store', 'ShoppingCart', false, 20)
ON CONFLICT (slug) DO NOTHING;

-- Create default configs for each channel
INSERT INTO channel_configurations (channel_id, config_data, credentials)
SELECT id, '{}'::jsonb, '{}'::jsonb
FROM sales_channels
WHERE slug IN ('email', 'woocommerce')
  AND NOT EXISTS (
    SELECT 1 FROM channel_configurations cc WHERE cc.channel_id = sales_channels.id
  );
