/*
  # Create Customer Delivery Addresses Tables

  ## Summary
  Adds support for importing and storing multiple delivery addresses per Orderwise
  customer, fetched from the /customers/{id}/delivery-addresses endpoint. Also adds
  a sync log table to audit each sync operation.

  ## New Tables

  ### customer_delivery_addresses
  Stores delivery addresses imported from Orderwise for each customer. A customer
  may have multiple delivery addresses.
  - `id` (uuid, primary key)
  - `customer_id` (uuid, FK to customers) — the local customer record
  - `external_id` (text) — the Orderwise delivery address ID
  - `name` (text) — address name / label
  - `contact_name` (text) — contact person at this address
  - `address1`–`address3` (text) — address lines
  - `town` (text)
  - `county` (text)
  - `postcode` (text)
  - `country` (text)
  - `country_code` (text)
  - `telephone` (text)
  - `email` (text)
  - `is_default` (boolean)
  - `last_synced_at` (timestamptz)
  - `created_at`, `updated_at` (timestamptz)
  - Unique constraint on (customer_id, external_id)

  ### delivery_address_sync_log
  Audit log for each delivery address sync operation.
  - `id` (uuid, primary key)
  - `customer_id` (uuid, FK to customers)
  - `erp_destination_id` (uuid, FK to erp_destinations)
  - `status` (text) — running / completed / failed
  - `addresses_fetched` (integer)
  - `addresses_created` (integer)
  - `addresses_updated` (integer)
  - `addresses_skipped` (integer)
  - `error_message` (text)
  - `error_details` (jsonb)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Authenticated users can read, insert, and update their own data
*/

CREATE TABLE IF NOT EXISTS customer_delivery_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text,
  contact_name text,
  address1 text,
  address2 text,
  address3 text,
  town text,
  county text,
  postcode text,
  country text,
  country_code text,
  telephone text,
  email text,
  is_default boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_delivery_addresses_unique
  ON customer_delivery_addresses(customer_id, external_id);

CREATE INDEX IF NOT EXISTS idx_customer_delivery_addresses_customer_id
  ON customer_delivery_addresses(customer_id);

ALTER TABLE customer_delivery_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer delivery addresses"
  ON customer_delivery_addresses FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert customer delivery addresses"
  ON customer_delivery_addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customer delivery addresses"
  ON customer_delivery_addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


CREATE TABLE IF NOT EXISTS delivery_address_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  erp_destination_id uuid NOT NULL REFERENCES erp_destinations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  addresses_fetched integer NOT NULL DEFAULT 0,
  addresses_created integer NOT NULL DEFAULT 0,
  addresses_updated integer NOT NULL DEFAULT 0,
  addresses_skipped integer NOT NULL DEFAULT 0,
  error_message text,
  error_details jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_address_sync_log_customer_id
  ON delivery_address_sync_log(customer_id);

CREATE INDEX IF NOT EXISTS idx_delivery_address_sync_log_erp_destination_id
  ON delivery_address_sync_log(erp_destination_id);

ALTER TABLE delivery_address_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read delivery address sync log"
  ON delivery_address_sync_log FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert delivery address sync log"
  ON delivery_address_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update delivery address sync log"
  ON delivery_address_sync_log FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
