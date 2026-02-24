/*
  # Add Orderwise Export Status to Orders

  ## Summary
  Adds a dedicated `ow_export_status` column to the `orders` table to track
  whether an order has been successfully exported to Orderwise (or failed to export).

  This keeps the Orderwise export outcome separate from the existing `parsing_status`
  field (which tracks the order review/confirmation workflow).

  ## Changes

  ### Modified Tables
  - `orders`
    - New column: `ow_export_status` (text, nullable)
      - NULL = never attempted
      - 'exported' = successfully sent to Orderwise
      - 'export_failed' = last export attempt failed

  ## Notes
  - Column is nullable so existing orders are unaffected (NULL = not yet exported)
  - No RLS changes needed — the orders table already has RLS policies in place
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'ow_export_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN ow_export_status text DEFAULT NULL;
  END IF;
END $$;
