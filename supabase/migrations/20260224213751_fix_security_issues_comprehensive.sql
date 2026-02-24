/*
  # Fix Remaining Security Issues

  1. Security Definer View
    - order_emails_view is defined with SECURITY DEFINER
    - This is a security risk as it bypasses RLS
    - Recreate view without SECURITY DEFINER (use SECURITY INVOKER)

  2. Changes
    - Drop and recreate order_emails_view with SECURITY INVOKER
    - This ensures RLS policies are properly enforced
    - Users only see data they have permission to access

  3. Security Impact
    - View now respects RLS policies
    - No privilege escalation risk
    - Maintains same functionality with proper security
*/

-- Drop the existing view
DROP VIEW IF EXISTS order_emails_view;

-- Recreate with SECURITY INVOKER (default, but explicit for clarity)
CREATE VIEW order_emails_view 
WITH (security_invoker = true)
AS
SELECT 
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
  o.channel_customer_id AS order_channel_customer_id,
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
  o.ow_export_status AS order_ow_export_status,
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

-- Grant appropriate permissions
GRANT SELECT ON order_emails_view TO authenticated;
