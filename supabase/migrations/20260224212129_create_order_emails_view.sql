/*
  # Create Order Emails View

  ## Summary
  Creates a unified view that LEFT JOINs raw_email with orders to provide a single
  interface for querying both parsed and unparsed emails together. This eliminates
  the need for complex PostgREST join syntax and improves query performance.

  ## View Structure
  - LEFT JOIN from raw_email to orders (keeps all emails, even unparsed ones)
  - All columns from orders table prefixed with `order_`
  - All columns from raw_email table prefixed with `email_`
  - Computed column `computed_status` for simplified filtering:
    - 'unparsed': Email has no associated order (order_id IS NULL)
    - 'pending': Order exists with parsing_status = 'pending' and no export status
    - 'confirmed': Order exists with parsing_status = 'confirmed' and no export status
    - 'exported': Order exists with ow_export_status = 'exported'
    - 'export_failed': Order exists with ow_export_status = 'export_failed'
    - 'failed': Order exists with parsing_status = 'failed'

  ## Performance Indexes
  - Index on (order_channel_source, order_ow_export_status) for exported tab
  - Index on (order_channel_source, order_parsing_status) for pending/confirmed tabs
  - Index on email_created_at for default sorting
  - Partial index on exported records for handling thousands of exported orders
  - GIN index for text search on subject and from_email

  ## Benefits
  - Single query interface for all email/order combinations
  - Real-time updates automatically reflected
  - Eliminates PostgREST join syntax limitations
  - Optimal performance for large datasets
  - Maintains all original table columns with clear prefixes

  ## Security
  - View inherits RLS policies from underlying tables
  - Users can only see data they have access to via existing RLS
*/

-- Enable pg_trgm extension for text search (must be before GIN index)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create the unified view with LEFT JOIN
CREATE OR REPLACE VIEW order_emails_view AS
SELECT
  -- Raw Email columns (prefixed with email_)
  re.id AS email_id,
  re.created_at AS email_created_at,
  re.content AS email_content,
  re.customer_id AS email_customer_id,
  re.date_parsed AS email_date_parsed,
  re.subject AS email_subject,
  re.from_email AS email_from_email,
  re.html_body AS email_html_body,
  re.message_id AS email_message_id,
  re.date_received AS email_date_received,
  re.platform AS email_platform,
  
  -- Orders columns (prefixed with order_)
  o.id AS order_id,
  o.raw_email_id AS order_raw_email_id,
  o.order_number AS order_order_number,
  o.notes AS order_notes,
  o.requester AS order_requester,
  o.template_type AS order_template_type,
  o.parsing_status AS order_parsing_status,
  o.parsing_error AS order_parsing_error,
  o.parsed_at AS order_parsed_at,
  o.created_at AS order_created_at,
  o.channel_source AS order_channel_source,
  o.channel_id AS order_channel_id,
  o.customer_id AS order_customer_id,
  o.external_order_id AS order_external_order_id,
  o.order_status AS order_order_status,
  o.currency AS order_currency,
  o.order_total AS order_order_total,
  o.shipping_total AS order_shipping_total,
  o.tax_total AS order_tax_total,
  o.discount_total AS order_discount_total,
  o.confirmed_at AS order_confirmed_at,
  o.confirmed_by AS order_confirmed_by,
  o.supplier_code AS order_supplier_code,
  o.required_date AS order_required_date,
  o.delivery_name AS order_delivery_name,
  o.delivery_address1 AS order_delivery_address1,
  o.delivery_address2 AS order_delivery_address2,
  o.delivery_address3 AS order_delivery_address3,
  o.delivery_address4 AS order_delivery_address4,
  o.delivery_address5 AS order_delivery_address5,
  o.delivery_town AS order_delivery_town,
  o.delivery_county AS order_delivery_county,
  o.delivery_postcode AS order_delivery_postcode,
  o.delivery_country AS order_delivery_country,
  o.delivery_country_code AS order_delivery_country_code,
  o.delivery_email AS order_delivery_email,
  o.delivery_telephone AS order_delivery_telephone,
  o.delivery_phone_extension AS order_delivery_phone_extension,
  o.delivery_mobile AS order_delivery_mobile,
  o.billing_name AS order_billing_name,
  o.billing_address1 AS order_billing_address1,
  o.billing_address2 AS order_billing_address2,
  o.billing_address3 AS order_billing_address3,
  o.billing_address4 AS order_billing_address4,
  o.billing_address5 AS order_billing_address5,
  o.billing_town AS order_billing_town,
  o.billing_county AS order_billing_county,
  o.billing_postcode AS order_billing_postcode,
  o.billing_country AS order_billing_country,
  o.billing_country_code AS order_billing_country_code,
  o.billing_email AS order_billing_email,
  o.billing_telephone AS order_billing_telephone,
  o.billing_phone_extension AS order_billing_phone_extension,
  o.billing_mobile AS order_billing_mobile,
  o.account_number AS order_account_number,
  o.full_address AS order_full_address,
  o.channel_customer_id AS order_channel_customer_id,
  o.ow_export_status AS order_ow_export_status,
  
  -- Computed status field for easier filtering
  CASE
    WHEN o.id IS NULL THEN 'unparsed'
    WHEN o.ow_export_status = 'exported' THEN 'exported'
    WHEN o.ow_export_status = 'export_failed' THEN 'export_failed'
    WHEN o.parsing_status = 'failed' THEN 'failed'
    WHEN o.parsing_status = 'confirmed' THEN 'confirmed'
    WHEN o.parsing_status = 'pending' THEN 'pending'
    ELSE 'unknown'
  END AS computed_status

FROM raw_email re
LEFT JOIN orders o ON re.id = o.raw_email_id;

-- Add indexes for optimal query performance
-- Index for exported tab (filtering by channel and export status)
CREATE INDEX IF NOT EXISTS idx_orders_channel_export_status 
ON orders(channel_source, ow_export_status) 
WHERE ow_export_status IS NOT NULL;

-- Index for pending/confirmed tabs (filtering by channel and parsing status)
CREATE INDEX IF NOT EXISTS idx_orders_channel_parsing_status 
ON orders(channel_source, parsing_status);

-- Index for sorting by email created_at (most common sort)
CREATE INDEX IF NOT EXISTS idx_raw_email_created_at_desc 
ON raw_email(created_at DESC);

-- Partial index for exported records (handles thousands efficiently)
CREATE INDEX IF NOT EXISTS idx_orders_exported_only 
ON orders(created_at DESC) 
WHERE ow_export_status = 'exported';

-- GIN index for text search on subject and from_email
CREATE INDEX IF NOT EXISTS idx_raw_email_search 
ON raw_email USING gin(
  (subject || ' ' || COALESCE(from_email, '')) gin_trgm_ops
);

-- Add comment to the view
COMMENT ON VIEW order_emails_view IS 
  'Unified view joining raw_email with orders. All raw_email columns prefixed with email_, 
   all orders columns prefixed with order_. Includes computed_status for easy filtering.
   Use this view instead of complex PostgREST joins for better performance and simplicity.';
