/*
  # Add Missing Foreign Key Indexes

  1. Purpose
    - Improve query performance by adding indexes on foreign key columns
    - These indexes help with JOIN operations and cascade deletes

  2. New Indexes
    - delivery_address_sync_items.delivery_address_id
    - erp_api_logs.erp_configuration_id
    - erp_configurations.erp_destination_id
    - invitations.invited_by

  3. Notes
    - Using IF NOT EXISTS to prevent errors if indexes already exist
*/

CREATE INDEX IF NOT EXISTS idx_delivery_address_sync_items_delivery_address_id
  ON public.delivery_address_sync_items(delivery_address_id);

CREATE INDEX IF NOT EXISTS idx_erp_api_logs_erp_configuration_id
  ON public.erp_api_logs(erp_configuration_id);

CREATE INDEX IF NOT EXISTS idx_erp_configurations_erp_destination_id
  ON public.erp_configurations(erp_destination_id);

CREATE INDEX IF NOT EXISTS idx_invitations_invited_by
  ON public.invitations(invited_by);
