
/*
  # Migrate WooCommerce Customers to channel_customers Table

  ## Summary
  WooCommerce customers were incorrectly stored in the `customers` table (which is
  intended for Orderwise ERP customers only). This migration moves all WooCommerce
  customers into the `channel_customers` table where they belong.

  ## Changes

  ### 1. Copy WooCommerce customers to channel_customers
  - All rows in `customers` where `source_channel_id` = WooCommerce channel ID
    are inserted into `channel_customers` with their original `id` preserved.
  - `channel_id` is set to the WooCommerce sales channel ID.
  - All address fields and metadata are carried over as-is.

  ### 2. Update order references
  - Orders that reference a WooCommerce customer via `customer_id` are updated:
    - `channel_customer_id` is set to the matching `channel_customers.id`
    - `customer_id` is set to NULL (no longer an Orderwise ERP customer)

  ### 3. Delete migrated rows from customers table
  - WooCommerce customer rows are removed from `customers` to avoid duplication.

  ## Important Notes
  1. The original `id` values are preserved in `channel_customers` so all existing
     references (if any) remain valid.
  2. 57 orders are updated to point to `channel_customers` instead of `customers`.
  3. Only rows with `source_channel_id = WooCommerce channel ID` are affected.
*/

DO $$
DECLARE
  woo_channel_id uuid := 'e11b1a63-a99f-46f2-b05f-a7a25fc37a98';
BEGIN

  INSERT INTO channel_customers (
    id,
    channel_id,
    external_id,
    name,
    email,
    phone,
    company,
    billing_name,
    billing_address1,
    billing_address2,
    billing_address3,
    billing_town,
    billing_county,
    billing_postcode,
    billing_country,
    billing_country_code,
    billing_email,
    billing_telephone,
    shipping_name,
    shipping_address1,
    shipping_address2,
    shipping_address3,
    shipping_town,
    shipping_county,
    shipping_postcode,
    shipping_country,
    shipping_country_code,
    shipping_email,
    shipping_telephone,
    metadata,
    created_at,
    updated_at
  )
  SELECT
    c.id,
    woo_channel_id,
    COALESCE(c.external_id, c.id::text),
    c.name,
    c.email,
    c.phone,
    c.company,
    c.billing_name,
    c.billing_address1,
    c.billing_address2,
    c.billing_address3,
    c.billing_town,
    c.billing_county,
    c.billing_postcode,
    c.billing_country,
    c.billing_country_code,
    c.billing_email,
    c.billing_telephone,
    c.shipping_name,
    c.shipping_address1,
    c.shipping_address2,
    c.shipping_address3,
    c.shipping_town,
    c.shipping_county,
    c.shipping_postcode,
    c.shipping_country,
    c.shipping_country_code,
    c.shipping_email,
    c.shipping_telephone,
    c.metadata,
    c.created_at,
    c.updated_at
  FROM customers c
  WHERE c.source_channel_id = woo_channel_id
  ON CONFLICT (id) DO NOTHING;

  UPDATE orders o
  SET
    channel_customer_id = o.customer_id,
    customer_id = NULL
  WHERE o.customer_id IN (
    SELECT id FROM customers WHERE source_channel_id = woo_channel_id
  );

  DELETE FROM customers
  WHERE source_channel_id = woo_channel_id;

END $$;
