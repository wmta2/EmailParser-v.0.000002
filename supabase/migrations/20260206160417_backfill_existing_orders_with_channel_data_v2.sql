/*
  # Backfill Existing Orders with Channel References

  ## Overview
  Links all existing orders to the "Email Orders" sales channel and sets appropriate
  default values for the new columns. Creates customer records from existing order data
  and links them.

  ## Changes
  1. Set channel_id to the Email Orders channel UUID for all existing orders
  2. Set external_order_id from the linked raw_email.message_id
  3. Set order_status based on existing parsing_status
  4. Create customer records from unique requester/from_email combinations
  5. Link existing orders to customer records
*/

-- Set channel_id for all existing orders to the Email channel
UPDATE orders
SET channel_id = (SELECT id FROM sales_channels WHERE slug = 'email' LIMIT 1)
WHERE channel_id IS NULL;

-- Set external_order_id from raw_email.message_id
UPDATE orders
SET external_order_id = re.message_id
FROM raw_email re
WHERE orders.raw_email_id = re.id
  AND orders.external_order_id IS NULL
  AND re.message_id IS NOT NULL;

-- Map parsing_status to order_status
UPDATE orders
SET order_status = CASE
  WHEN parsing_status = 'success' THEN 'processing'
  WHEN parsing_status = 'failed' THEN 'pending'
  ELSE 'pending'
END
WHERE order_status = 'pending';

-- Create customer records from existing order data
INSERT INTO customers (external_id, source_channel_id, name, email, metadata)
SELECT DISTINCT ON (COALESCE(o.requester, re.from_email, 'unknown'))
  re.message_id,
  (SELECT id FROM sales_channels WHERE slug = 'email' LIMIT 1),
  COALESCE(o.requester, 'Unknown'),
  re.from_email,
  jsonb_build_object('source', 'backfill', 'original_requester', o.requester)
FROM orders o
LEFT JOIN raw_email re ON o.raw_email_id = re.id
WHERE o.customer_id IS NULL
  AND (o.requester IS NOT NULL OR re.from_email IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Link orders to customer records via a subquery
UPDATE orders o_target
SET customer_id = matched.cid
FROM (
  SELECT o.id AS order_id, c.id AS cid
  FROM orders o
  LEFT JOIN raw_email re ON o.raw_email_id = re.id
  JOIN customers c ON (
    (c.email IS NOT NULL AND re.from_email IS NOT NULL AND c.email = re.from_email)
    OR (c.name = o.requester AND c.name != 'Unknown' AND c.name != '')
  )
  WHERE o.customer_id IS NULL
) matched
WHERE o_target.id = matched.order_id;
