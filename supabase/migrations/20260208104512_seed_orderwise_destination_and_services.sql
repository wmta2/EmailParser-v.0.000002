/*
  # Seed Orderwise ERP Destination and API Services

  1. Inserts the Orderwise ERP destination record
  2. Inserts all Orderwise API service categories
    - Sales Orders (enabled by default - primary use case)
    - Customers, Products, Variants, Stock, Purchasing, Despatch,
      Returns, CRM, Accounts/Payments, Reporting, System (all disabled)

  These service records define which API capabilities are available
  and can be toggled on/off by administrators.
*/

DO $$
DECLARE
  ow_id uuid;
BEGIN
  INSERT INTO erp_destinations (name, slug, erp_type, description, icon_name, enabled, priority)
  VALUES (
    'Orderwise',
    'orderwise',
    'orderwise',
    'Orderwise ERP - integrated business management software for order processing, stock control, and warehouse management.',
    'Server',
    false,
    1
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO ow_id;

  IF ow_id IS NULL THEN
    SELECT id INTO ow_id FROM erp_destinations WHERE slug = 'orderwise';
  END IF;

  INSERT INTO erp_services (erp_destination_id, service_slug, service_name, description, enabled)
  VALUES
    (ow_id, 'sales-orders', 'Sales Orders', 'Create and manage sales orders in Orderwise. Import orders from your portal into Orderwise for fulfilment.', true),
    (ow_id, 'customers', 'Customers', 'Create and manage customer records in Orderwise. Sync customer data between your portal and Orderwise.', false),
    (ow_id, 'products', 'Products', 'Manage product records in Orderwise. Create and update product information.', false),
    (ow_id, 'variants', 'Variants', 'Manage product variants, supplier details, and alternate codes in Orderwise.', false),
    (ow_id, 'stock', 'Stock', 'View stock levels, adjust stock in/out, and create transfer orders in Orderwise.', false),
    (ow_id, 'purchasing', 'Purchasing', 'Manage purchase orders and supplier invoices in Orderwise.', false),
    (ow_id, 'despatch', 'Despatch', 'Manage order despatch, shipping, and delivery tracking in Orderwise.', false),
    (ow_id, 'returns', 'Returns', 'Process customer returns in Orderwise.', false),
    (ow_id, 'crm', 'CRM', 'Manage CRM records and activities in Orderwise.', false),
    (ow_id, 'payments', 'Payments', 'View and manage payment records and sales receipts in Orderwise.', false),
    (ow_id, 'reporting', 'Reporting', 'Generate reports and layouts from Orderwise.', false),
    (ow_id, 'system', 'System / Export Definitions', 'Access system settings, stock locations, and run custom export definitions in Orderwise.', false)
  ON CONFLICT (erp_destination_id, service_slug) DO NOTHING;
END $$;
