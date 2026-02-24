/*
  # Add Pending Order Workflow

  This migration adds a transitional "pending" phase for email orders before they become confirmed orders.

  ## Changes

  1. Updates parsing_status values:
     - Changes 'success' → 'confirmed' to indicate final approval
     - Keeps 'pending' for orders awaiting review
     - Keeps 'failed' for parsing failures

  2. New columns in orders table:
     - `confirmed_at` (timestamptz) - When order was confirmed/approved
     - `confirmed_by` (uuid) - Reference to user who confirmed the order

  3. Data migration:
     - Updates all existing orders with parsing_status='success' to 'confirmed'
     - Sets confirmed_at to parsed_at for historical orders
     - Backfills confirmed_by where possible

  ## Workflow

  1. Email arrives → raw_email table
  2. Parse email → orders table with parsing_status='pending'
  3. Review/edit → user validates and modifies pending order
  4. Confirm order → parsing_status changes to 'confirmed', ready for ERP export
*/

-- Add new columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN confirmed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'confirmed_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN confirmed_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update existing orders: change 'success' to 'confirmed'
UPDATE orders
SET 
  parsing_status = 'confirmed',
  confirmed_at = COALESCE(parsed_at, created_at)
WHERE parsing_status = 'success';

-- Add comment to parsing_status column for clarity
COMMENT ON COLUMN orders.parsing_status IS 'Order parsing workflow status: pending (awaiting review), confirmed (approved and ready), failed (parsing error)';

-- Create index on confirmed_at for filtering
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_at ON orders(confirmed_at) WHERE confirmed_at IS NOT NULL;

-- Create index on confirmed_by for audit queries
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_by ON orders(confirmed_by) WHERE confirmed_by IS NOT NULL;