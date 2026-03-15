/*
  # Add missing foreign key indexes

  ## Summary
  Creates covering indexes for foreign key columns that are currently unindexed.
  Unindexed foreign keys cause full table scans during JOIN operations and
  CASCADE operations, degrading query performance.

  ## New Indexes
  - channel_raw_imports.sync_log_id
  - customer_profiles.customer_id
  - delivery_address_sync_items.delivery_address_id
  - delivery_address_sync_log.erp_destination_id
  - erp_api_logs.erp_configuration_id
  - erp_configurations.erp_destination_id
  - invitations.invited_by
  - orders.confirmed_by
*/

CREATE INDEX IF NOT EXISTS idx_channel_raw_imports_sync_log_id
  ON public.channel_raw_imports (sync_log_id);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_customer_id
  ON public.customer_profiles (customer_id);

CREATE INDEX IF NOT EXISTS idx_delivery_address_sync_items_delivery_address_id
  ON public.delivery_address_sync_items (delivery_address_id);

CREATE INDEX IF NOT EXISTS idx_delivery_address_sync_log_erp_destination_id
  ON public.delivery_address_sync_log (erp_destination_id);

CREATE INDEX IF NOT EXISTS idx_erp_api_logs_erp_configuration_id
  ON public.erp_api_logs (erp_configuration_id);

CREATE INDEX IF NOT EXISTS idx_erp_configurations_erp_destination_id
  ON public.erp_configurations (erp_destination_id);

CREATE INDEX IF NOT EXISTS idx_invitations_invited_by
  ON public.invitations (invited_by);

CREATE INDEX IF NOT EXISTS idx_orders_confirmed_by
  ON public.orders (confirmed_by);
