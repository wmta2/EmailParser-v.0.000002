/*
  # Create ERP Destination Tables

  This migration creates the core tables for managing ERP integrations (outbound order export).

  1. New Tables
    - `erp_destinations`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Display name (e.g. "Orderwise")
      - `slug` (text, unique) - URL-safe identifier
      - `erp_type` (text) - Type identifier for adapter lookup
      - `description` (text) - Human-readable description
      - `icon_name` (text) - Lucide icon name for UI
      - `enabled` (boolean) - Whether destination is active
      - `priority` (integer) - Sort order
      - `created_at` / `updated_at` (timestamptz)

    - `erp_configurations`
      - `id` (uuid, primary key)
      - `erp_destination_id` (uuid, FK to erp_destinations)
      - `config_data` (jsonb) - Non-sensitive settings (session_id, field mapping defaults)
      - `credentials` (jsonb) - Sensitive data (base_url, username, password)
      - `last_sync_at` (timestamptz) - Last successful export time
      - `sync_status` (text) - Current sync state (idle/syncing/error)
      - `created_at` / `updated_at` (timestamptz)

    - `erp_services`
      - `id` (uuid, primary key)
      - `erp_destination_id` (uuid, FK to erp_destinations)
      - `service_slug` (text) - Machine name for service
      - `service_name` (text) - Display name
      - `description` (text) - What this service does
      - `enabled` (boolean) - Whether this service is active
      - `created_at` (timestamptz)

    - `order_exports`
      - `id` (uuid, primary key)
      - `order_id` (uuid, FK to orders)
      - `erp_destination_id` (uuid, FK to erp_destinations)
      - `export_status` (text) - pending/processing/success/failed
      - `external_order_id` (text) - Orderwise order ID returned
      - `external_order_number` (text) - Orderwise order number
      - `error_message` (text) - Error description if failed
      - `request_payload` (jsonb) - What was sent to API
      - `response_payload` (jsonb) - What API returned
      - `exported_at` (timestamptz) - When export succeeded
      - `created_at` (timestamptz)

    - `erp_sync_log`
      - `id` (uuid, primary key)
      - `erp_destination_id` (uuid, FK to erp_destinations)
      - `sync_type` (text) - Type of sync operation
      - `status` (text) - completed/failed/partial
      - `orders_exported` (integer) - Count of successful exports
      - `orders_skipped` (integer) - Already exported / skipped
      - `orders_failed` (integer) - Failed exports
      - `error_message` (text) - Summary error
      - `error_details` (jsonb) - Detailed error info
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Policies restrict access to authenticated users only
    - erp_destinations and erp_services: read access for all authenticated users
    - erp_configurations, order_exports, erp_sync_log: full CRUD for authenticated users

  3. Indexes
    - order_exports: index on order_id and erp_destination_id for fast lookups
    - erp_sync_log: index on erp_destination_id for filtering
    - erp_services: unique constraint on (erp_destination_id, service_slug)
*/

-- erp_destinations
CREATE TABLE IF NOT EXISTS erp_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  erp_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'Server',
  enabled boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE erp_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ERP destinations"
  ON erp_destinations FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ERP destinations"
  ON erp_destinations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ERP destinations"
  ON erp_destinations FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ERP destinations"
  ON erp_destinations FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- erp_configurations
CREATE TABLE IF NOT EXISTS erp_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_destination_id uuid NOT NULL REFERENCES erp_destinations(id) ON DELETE CASCADE,
  config_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  sync_status text NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE erp_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ERP configurations"
  ON erp_configurations FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ERP configurations"
  ON erp_configurations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ERP configurations"
  ON erp_configurations FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ERP configurations"
  ON erp_configurations FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- erp_services
CREATE TABLE IF NOT EXISTS erp_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_destination_id uuid NOT NULL REFERENCES erp_destinations(id) ON DELETE CASCADE,
  service_slug text NOT NULL,
  service_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (erp_destination_id, service_slug)
);

ALTER TABLE erp_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ERP services"
  ON erp_services FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ERP services"
  ON erp_services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ERP services"
  ON erp_services FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ERP services"
  ON erp_services FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- order_exports
CREATE TABLE IF NOT EXISTS order_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  erp_destination_id uuid NOT NULL REFERENCES erp_destinations(id) ON DELETE CASCADE,
  export_status text NOT NULL DEFAULT 'pending',
  external_order_id text,
  external_order_number text,
  error_message text,
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_payload jsonb DEFAULT '{}'::jsonb,
  exported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view order exports"
  ON order_exports FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert order exports"
  ON order_exports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update order exports"
  ON order_exports FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete order exports"
  ON order_exports FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_order_exports_order_id ON order_exports(order_id);
CREATE INDEX IF NOT EXISTS idx_order_exports_erp_destination_id ON order_exports(erp_destination_id);
CREATE INDEX IF NOT EXISTS idx_order_exports_status ON order_exports(export_status);

-- erp_sync_log
CREATE TABLE IF NOT EXISTS erp_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_destination_id uuid NOT NULL REFERENCES erp_destinations(id) ON DELETE CASCADE,
  sync_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'started',
  orders_exported integer NOT NULL DEFAULT 0,
  orders_skipped integer NOT NULL DEFAULT 0,
  orders_failed integer NOT NULL DEFAULT 0,
  error_message text,
  error_details jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE erp_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ERP sync logs"
  ON erp_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ERP sync logs"
  ON erp_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ERP sync logs"
  ON erp_sync_log FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ERP sync logs"
  ON erp_sync_log FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_erp_sync_log_destination ON erp_sync_log(erp_destination_id);
