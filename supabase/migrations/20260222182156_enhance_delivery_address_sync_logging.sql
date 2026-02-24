/*
  # Enhance Delivery Address Sync Logging with Request/Response Capture

  ## Summary
  Adds comprehensive API request/response logging to the delivery address sync feature,
  plus individual tracking of each address operation during a sync.

  ## Changes to delivery_address_sync_log

  ### New Columns
  - `request_headers` (jsonb) - Full request headers (bearer token truncated)
  - `request_body` (jsonb) - Full request payload (if any)
  - `response_headers` (jsonb) - Full response headers
  - `response_body` (jsonb) - Full API response data
  - `http_method` (text) - HTTP method used (e.g., GET)
  - `endpoint` (text) - Full API endpoint called
  - `duration_ms` (integer) - Request duration in milliseconds

  ## New Tables

  ### delivery_address_sync_items
  Tracks individual addresses processed during each sync operation.
  - `id` (uuid, primary key)
  - `sync_log_id` (uuid, FK to delivery_address_sync_log)
  - `delivery_address_id` (uuid, FK to customer_delivery_addresses, nullable)
  - `external_id` (text) - The Orderwise address ID
  - `action` (text) - "created", "updated", or "skipped"
  - `address_snapshot` (jsonb) - Snapshot of address data at sync time
  - `error_message` (text, nullable) - If skipped, the reason
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on new table
  - Authenticated users can read and insert sync items
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_address_sync_log' AND column_name = 'request_headers'
  ) THEN
    ALTER TABLE delivery_address_sync_log ADD COLUMN request_headers jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_address_sync_log' AND column_name = 'request_body'
  ) THEN
    ALTER TABLE delivery_address_sync_log ADD COLUMN request_body jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_address_sync_log' AND column_name = 'response_headers'
  ) THEN
    ALTER TABLE delivery_address_sync_log ADD COLUMN response_headers jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_address_sync_log' AND column_name = 'response_body'
  ) THEN
    ALTER TABLE delivery_address_sync_log ADD COLUMN response_body jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_address_sync_log' AND column_name = 'http_method'
  ) THEN
    ALTER TABLE delivery_address_sync_log ADD COLUMN http_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_address_sync_log' AND column_name = 'endpoint'
  ) THEN
    ALTER TABLE delivery_address_sync_log ADD COLUMN endpoint text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_address_sync_log' AND column_name = 'duration_ms'
  ) THEN
    ALTER TABLE delivery_address_sync_log ADD COLUMN duration_ms integer;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS delivery_address_sync_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_log_id uuid NOT NULL REFERENCES delivery_address_sync_log(id) ON DELETE CASCADE,
  delivery_address_id uuid REFERENCES customer_delivery_addresses(id) ON DELETE SET NULL,
  external_id text NOT NULL,
  action text NOT NULL,
  address_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_address_sync_items_sync_log_id
  ON delivery_address_sync_items(sync_log_id);

CREATE INDEX IF NOT EXISTS idx_delivery_address_sync_items_action
  ON delivery_address_sync_items(action);

ALTER TABLE delivery_address_sync_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'delivery_address_sync_items' AND policyname = 'Authenticated users can read delivery address sync items'
  ) THEN
    CREATE POLICY "Authenticated users can read delivery address sync items"
      ON delivery_address_sync_items FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'delivery_address_sync_items' AND policyname = 'Authenticated users can insert delivery address sync items'
  ) THEN
    CREATE POLICY "Authenticated users can insert delivery address sync items"
      ON delivery_address_sync_items FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;
