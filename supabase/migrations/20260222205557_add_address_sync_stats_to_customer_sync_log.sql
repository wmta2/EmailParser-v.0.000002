/*
  # Add Address Sync Statistics to Customer Sync Log

  ## Summary
  Adds columns to track aggregate delivery address sync statistics 
  during customer sync operations.

  ## New Columns on customer_sync_log
  - `addresses_fetched` (integer, default 0) - Total addresses fetched from Orderwise
  - `addresses_created` (integer, default 0) - New addresses inserted
  - `addresses_updated` (integer, default 0) - Existing addresses updated
  - `addresses_skipped` (integer, default 0) - Addresses skipped due to errors

  ## Notes
  - These columns aggregate stats across all customers processed in a single sync
  - Individual customer address sync details remain in delivery_address_sync_log
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_sync_log' AND column_name = 'addresses_fetched'
  ) THEN
    ALTER TABLE customer_sync_log ADD COLUMN addresses_fetched integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_sync_log' AND column_name = 'addresses_created'
  ) THEN
    ALTER TABLE customer_sync_log ADD COLUMN addresses_created integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_sync_log' AND column_name = 'addresses_updated'
  ) THEN
    ALTER TABLE customer_sync_log ADD COLUMN addresses_updated integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_sync_log' AND column_name = 'addresses_skipped'
  ) THEN
    ALTER TABLE customer_sync_log ADD COLUMN addresses_skipped integer NOT NULL DEFAULT 0;
  END IF;
END $$;