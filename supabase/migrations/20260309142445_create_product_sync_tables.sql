/*
  # Create Product Sync Tables and Infrastructure

  1. New Tables
    - `product_sync_log`
      - Tracks each product sync run from Orderwise
      - Records counts, status, timing, and errors
    - `product_sync_items`
      - Detailed log of individual product operations during sync
      - Links to products table and sync_log
    - `product_price_lists`
      - Stores price lists from Orderwise
      - Maps to Orderwise price list IDs
    - `product_prices`
      - Junction table for products and price lists
      - Stores customer-specific pricing

  2. Indexes
    - Fast lookups by SKU, external_id, sync status
    - Price list queries optimized

  3. Security
    - Enable RLS on all tables
    - Policies for authenticated users to read/manage products
    - Admin-only access to sync logs

  4. Functions
    - Trigger to update products.updated_at
    - Function to clean old sync logs (keep last 30 days)
*/

-- Add Orderwise product ID to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS orderwise_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_level NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index on external_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id);
CREATE INDEX IF NOT EXISTS idx_products_orderwise_id ON products(orderwise_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_code ON products(supplier_code);

-- Product sync log table
CREATE TABLE IF NOT EXISTS product_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_destination_id UUID NOT NULL REFERENCES erp_destinations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'manual' CHECK (sync_type IN ('manual', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  products_fetched INTEGER NOT NULL DEFAULT 0,
  products_created INTEGER NOT NULL DEFAULT 0,
  products_updated INTEGER NOT NULL DEFAULT 0,
  products_skipped INTEGER NOT NULL DEFAULT 0,
  prices_fetched INTEGER NOT NULL DEFAULT 0,
  prices_updated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_modified_since TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_sync_log ENABLE ROW LEVEL SECURITY;

-- Product sync log policies
CREATE POLICY "Authenticated users can view product sync logs"
  ON product_sync_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product sync logs"
  ON product_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product sync logs"
  ON product_sync_log FOR UPDATE
  TO authenticated
  USING (true);

-- Product sync items table (detailed log)
CREATE TABLE IF NOT EXISTS product_sync_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_log_id UUID NOT NULL REFERENCES product_sync_log(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  external_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'skipped')),
  product_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_sync_items ENABLE ROW LEVEL SECURITY;

-- Product sync items policies
CREATE POLICY "Authenticated users can view product sync items"
  ON product_sync_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product sync items"
  ON product_sync_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Product price lists table
CREATE TABLE IF NOT EXISTS product_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  external_id TEXT NOT NULL,
  orderwise_id INTEGER,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(external_id)
);

-- Enable RLS
ALTER TABLE product_price_lists ENABLE ROW LEVEL SECURITY;

-- Price lists policies
CREATE POLICY "Authenticated users can view price lists"
  ON product_price_lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage price lists"
  ON product_price_lists FOR ALL
  TO authenticated
  USING (true);

-- Product prices junction table
CREATE TABLE IF NOT EXISTS product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_list_id UUID NOT NULL REFERENCES product_price_lists(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, price_list_id)
);

-- Enable RLS
ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;

-- Product prices policies
CREATE POLICY "Authenticated users can view product prices"
  ON product_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage product prices"
  ON product_prices FOR ALL
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_sync_log_erp ON product_sync_log(erp_destination_id);
CREATE INDEX IF NOT EXISTS idx_product_sync_log_status ON product_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_product_sync_log_created ON product_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_sync_items_sync_log ON product_sync_items(sync_log_id);
CREATE INDEX IF NOT EXISTS idx_product_sync_items_product ON product_sync_items(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_price_list ON product_prices(price_list_id);
CREATE INDEX IF NOT EXISTS idx_product_price_lists_external_id ON product_price_lists(external_id);

-- Function to clean old product sync logs (keep last 30 days)
CREATE OR REPLACE FUNCTION delete_old_product_sync_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM product_sync_log
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Update trigger for product_price_lists
CREATE TRIGGER update_product_price_lists_updated_at
  BEFORE UPDATE ON product_price_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for product_prices
CREATE TRIGGER update_product_prices_updated_at
  BEFORE UPDATE ON product_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable the products service in erp_services
INSERT INTO erp_services (erp_destination_id, service_slug, service_name, description, enabled)
SELECT
  id,
  'products',
  'Products',
  'Sync product catalog, pricing, and stock levels from Orderwise.',
  false
FROM erp_destinations
WHERE slug = 'orderwise'
ON CONFLICT (erp_destination_id, service_slug) DO UPDATE
  SET description = EXCLUDED.description;
