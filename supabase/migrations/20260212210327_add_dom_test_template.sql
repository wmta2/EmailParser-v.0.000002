/*
  # Add DOM-Based Test Template

  1. Purpose
    - Adds a new template that uses DOM parsing instead of regex
    - Provides an alternative parsing method for structured HTML emails
    - Can be tested alongside regex-based templates

  2. Template Details
    - Template Type: `dom-test`
    - Template Name: DOM Parser Test
    - Provider: Generic (works with most HTML emails)
    - Parsing Method: DOM traversal

  3. Detection
    - Detects HTML emails with table structures
    - Looks for common order-related keywords
    - Activated when HTML structure is present

  4. Notes
    - This template uses CSS selectors instead of regex patterns
    - More reliable for well-structured HTML emails
    - Can be customized per email provider
    - Serves as a test/comparison with regex-based parsing
*/

-- Add the DOM test template
INSERT INTO email_template_patterns (
  template_name,
  template_type,
  provider_name,
  platform,
  detection_keywords,
  confidence_threshold,
  table_header_keywords,
  column_mapping,
  priority,
  active
) VALUES (
  'DOM Parser Test',
  'dom-test',
  'Generic HTML Email',
  'email',
  to_jsonb(ARRAY['order', 'product', 'quantity', 'price', 'shipping', 'delivery']),
  50.0,
  to_jsonb(ARRAY['product', 'quantity', 'price', 'total']),
  jsonb_build_object(
    'product', 'product_name',
    'name', 'product_name',
    'item', 'product_name',
    'sku', 'product_code',
    'code', 'product_code',
    'qty', 'quantity',
    'quantity', 'quantity',
    'price', 'unit_price',
    'unit price', 'unit_price',
    'amount', 'unit_price',
    'total', 'total',
    'line total', 'total'
  ),
  5,
  true
)
ON CONFLICT (template_type) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  provider_name = EXCLUDED.provider_name,
  detection_keywords = EXCLUDED.detection_keywords,
  confidence_threshold = EXCLUDED.confidence_threshold,
  table_header_keywords = EXCLUDED.table_header_keywords,
  column_mapping = EXCLUDED.column_mapping,
  priority = EXCLUDED.priority,
  active = EXCLUDED.active,
  updated_at = now();
