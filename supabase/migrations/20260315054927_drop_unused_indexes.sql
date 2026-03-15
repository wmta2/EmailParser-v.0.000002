/*
  # Drop unused indexes

  ## Summary
  Removes indexes that have never been used according to pg_stat_user_indexes.
  Unused indexes consume disk space and slow down write operations (INSERT/UPDATE/DELETE)
  without providing any query benefit.

  ## Dropped indexes
  - idx_gmail_import_rules_enabled (gmail_import_rules)
  - idx_gmail_sync_log_status (gmail_sync_log)
  - idx_gmail_schedule_windows_enabled (gmail_schedule_windows)
  - idx_products_orderwise_id (products)
  - idx_products_supplier_code (products)
  - idx_products_external_id (products)
  - idx_product_sync_log_status (product_sync_log)
  - idx_product_sync_log_created (product_sync_log)
  - idx_product_sync_items_sync_log (product_sync_items)
  - idx_product_sync_items_product (product_sync_items)
  - idx_product_prices_product (product_prices)
  - idx_product_prices_price_list (product_prices)
  - idx_product_price_lists_external_id (product_price_lists)
*/

DROP INDEX IF EXISTS public.idx_gmail_import_rules_enabled;
DROP INDEX IF EXISTS public.idx_gmail_sync_log_status;
DROP INDEX IF EXISTS public.idx_gmail_schedule_windows_enabled;
DROP INDEX IF EXISTS public.idx_products_orderwise_id;
DROP INDEX IF EXISTS public.idx_products_supplier_code;
DROP INDEX IF EXISTS public.idx_products_external_id;
DROP INDEX IF EXISTS public.idx_product_sync_log_status;
DROP INDEX IF EXISTS public.idx_product_sync_log_created;
DROP INDEX IF EXISTS public.idx_product_sync_items_sync_log;
DROP INDEX IF EXISTS public.idx_product_sync_items_product;
DROP INDEX IF EXISTS public.idx_product_prices_product;
DROP INDEX IF EXISTS public.idx_product_prices_price_list;
DROP INDEX IF EXISTS public.idx_product_price_lists_external_id;
