/*
  # Add Missing Foreign Key Indexes

  1. Problem
    - Several foreign key columns lack indexes
    - This causes poor query performance for JOIN operations
    - Database cannot efficiently enforce referential integrity

  2. Changes
    - Add indexes for all unindexed foreign key columns:
      - channel_raw_imports.sync_log_id
      - delivery_address_sync_items.delivery_address_id
      - delivery_address_sync_log.erp_destination_id
      - erp_api_logs.erp_configuration_id
      - erp_configurations.erp_destination_id
      - invitations.invited_by
      - orders.confirmed_by

  3. Benefits
    - Faster JOIN queries
    - Better foreign key constraint checking performance
    - Improved overall database performance
*/

-- Add index for channel_raw_imports.sync_log_id
CREATE INDEX IF NOT EXISTS idx_channel_raw_imports_sync_log_id 
  ON channel_raw_imports(sync_log_id);

-- Add index for delivery_address_sync_items.delivery_address_id
CREATE INDEX IF NOT EXISTS idx_delivery_address_sync_items_delivery_address_id 
  ON delivery_address_sync_items(delivery_address_id);

-- Add index for delivery_address_sync_log.erp_destination_id
CREATE INDEX IF NOT EXISTS idx_delivery_address_sync_log_erp_destination_id 
  ON delivery_address_sync_log(erp_destination_id);

-- Add index for erp_api_logs.erp_configuration_id
CREATE INDEX IF NOT EXISTS idx_erp_api_logs_erp_configuration_id 
  ON erp_api_logs(erp_configuration_id);

-- Add index for erp_configurations.erp_destination_id
CREATE INDEX IF NOT EXISTS idx_erp_configurations_erp_destination_id 
  ON erp_configurations(erp_destination_id);

-- Add index for invitations.invited_by
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by 
  ON invitations(invited_by);

-- Add index for orders.confirmed_by
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_by 
  ON orders(confirmed_by);
