/*
  # Add export_to_erp Column to Order Items

  1. Changes
    - Adds `export_to_erp` boolean column to `order_items` table
    - Default value is `true` (all items exported by default)
    - Allows users to selectively exclude individual items from Orderwise export

  2. Purpose
    - Enables granular control over which line items are included in ERP exports
    - When an order is parsed/imported, all items default to being exported
    - Users can toggle individual items off to exclude them from the export payload
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'export_to_erp'
  ) THEN
    ALTER TABLE order_items ADD COLUMN export_to_erp boolean NOT NULL DEFAULT true;
  END IF;
END $$;
