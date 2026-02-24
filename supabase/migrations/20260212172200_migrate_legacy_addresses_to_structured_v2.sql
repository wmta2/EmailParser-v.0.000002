/*
  # Migrate Legacy Address Fields to Structured Format

  ## Overview
  This migration contains a PL/pgSQL function that parses existing single-field addresses
  into structured components. It handles UK postcodes and attempts to intelligently
  split address lines.

  ## What It Does
  1. Creates a function to parse address text into structured components
  2. Migrates all existing order delivery and billing addresses
  3. Migrates all existing customer billing and shipping addresses
  4. Generates a report of successfully migrated records

  ## Strategy
  - Extract UK postcodes using regex
  - Split address into lines
  - Assign first line as name
  - Assign subsequent lines as address1, address2, address3
  - Extract town from postcode line
  - Set country to "United Kingdom" when UK postcode is found

  ## Safety
  - Does NOT delete legacy fields
  - Only updates NULL structured fields (idempotent)
  - Can be run multiple times safely
*/

-- ============================================================================
-- FUNCTION: Parse Address Text to Structured Components
-- ============================================================================

CREATE OR REPLACE FUNCTION parse_address_to_structured(address_text text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  lines text[];
  postcode_match text;
  postcode_line_index int;
  result jsonb := '{}'::jsonb;
  i int;
  town_text text;
BEGIN
  -- Return empty object if address is null or empty
  IF address_text IS NULL OR trim(address_text) = '' THEN
    RETURN result;
  END IF;

  -- Split address into lines and remove empty lines
  lines := string_to_array(address_text, E'\n');
  lines := array_remove(lines, '');
  
  -- Remove leading/trailing whitespace from each line
  FOR i IN 1..array_length(lines, 1) LOOP
    lines[i] := trim(lines[i]);
  END LOOP;
  
  -- Remove empty lines after trimming
  lines := array_remove(lines, '');

  IF array_length(lines, 1) = 0 THEN
    RETURN result;
  END IF;

  -- Try to find UK postcode (working backwards from end)
  postcode_line_index := 0;
  FOR i IN REVERSE array_length(lines, 1)..1 LOOP
    postcode_match := substring(lines[i] FROM '[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}');
    IF postcode_match IS NOT NULL THEN
      postcode_line_index := i;
      result := jsonb_set(result, '{postcode}', to_jsonb(upper(postcode_match)::text));
      EXIT;
    END IF;
  END LOOP;

  -- Assign lines to structured fields
  IF array_length(lines, 1) >= 1 THEN
    result := jsonb_set(result, '{name}', to_jsonb(lines[1]::text));
  END IF;

  IF array_length(lines, 1) >= 2 THEN
    result := jsonb_set(result, '{address1}', to_jsonb(lines[2]::text));
  END IF;

  IF array_length(lines, 1) >= 3 THEN
    result := jsonb_set(result, '{address2}', to_jsonb(lines[3]::text));
  END IF;

  -- If we found a postcode, extract town from that line
  IF postcode_line_index > 0 THEN
    -- Remove postcode from line to get town
    town_text := trim(regexp_replace(lines[postcode_line_index], '[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}', '', 'i'));
    IF town_text <> '' THEN
      result := jsonb_set(result, '{town}', to_jsonb(town_text::text));
    END IF;

    -- If postcode line is beyond address3, use line 4 as address3
    IF postcode_line_index > 4 AND array_length(lines, 1) >= 4 THEN
      result := jsonb_set(result, '{address3}', to_jsonb(lines[4]::text));
    END IF;
  ELSIF array_length(lines, 1) >= 4 THEN
    result := jsonb_set(result, '{address3}', to_jsonb(lines[4]::text));
  END IF;

  -- If we found a UK postcode, set country
  IF postcode_match IS NOT NULL THEN
    result := jsonb_set(result, '{country}', to_jsonb('United Kingdom'::text));
  END IF;

  RETURN result;
END;
$$;

-- ============================================================================
-- MIGRATE ORDERS: Delivery Addresses
-- ============================================================================

DO $$
DECLARE
  order_record RECORD;
  parsed jsonb;
  updated_count int := 0;
BEGIN
  FOR order_record IN 
    SELECT id, delivery_address 
    FROM orders 
    WHERE delivery_address IS NOT NULL 
      AND trim(delivery_address) <> ''
      AND delivery_address1 IS NULL
  LOOP
    parsed := parse_address_to_structured(order_record.delivery_address);
    
    UPDATE orders
    SET
      delivery_name = parsed->>'name',
      delivery_address1 = parsed->>'address1',
      delivery_address2 = parsed->>'address2',
      delivery_address3 = parsed->>'address3',
      delivery_town = parsed->>'town',
      delivery_postcode = parsed->>'postcode',
      delivery_country = parsed->>'country'
    WHERE id = order_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % order delivery addresses', updated_count;
END $$;

-- ============================================================================
-- MIGRATE ORDERS: Billing Addresses
-- ============================================================================

DO $$
DECLARE
  order_record RECORD;
  parsed jsonb;
  updated_count int := 0;
BEGIN
  FOR order_record IN 
    SELECT id, billing_address 
    FROM orders 
    WHERE billing_address IS NOT NULL 
      AND trim(billing_address) <> ''
      AND billing_address1 IS NULL
  LOOP
    parsed := parse_address_to_structured(order_record.billing_address);
    
    UPDATE orders
    SET
      billing_name = parsed->>'name',
      billing_address1 = parsed->>'address1',
      billing_address2 = parsed->>'address2',
      billing_address3 = parsed->>'address3',
      billing_town = parsed->>'town',
      billing_postcode = parsed->>'postcode',
      billing_country = parsed->>'country'
    WHERE id = order_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % order billing addresses', updated_count;
END $$;

-- ============================================================================
-- MIGRATE CUSTOMERS: Billing Addresses
-- ============================================================================

DO $$
DECLARE
  customer_record RECORD;
  parsed jsonb;
  updated_count int := 0;
BEGIN
  FOR customer_record IN 
    SELECT id, billing_address 
    FROM customers 
    WHERE billing_address IS NOT NULL 
      AND trim(billing_address) <> ''
      AND billing_address1 IS NULL
  LOOP
    parsed := parse_address_to_structured(customer_record.billing_address);
    
    UPDATE customers
    SET
      billing_name = parsed->>'name',
      billing_address1 = parsed->>'address1',
      billing_address2 = parsed->>'address2',
      billing_address3 = parsed->>'address3',
      billing_town = parsed->>'town',
      billing_postcode = parsed->>'postcode',
      billing_country = parsed->>'country'
    WHERE id = customer_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % customer billing addresses', updated_count;
END $$;

-- ============================================================================
-- MIGRATE CUSTOMERS: Shipping Addresses
-- ============================================================================

DO $$
DECLARE
  customer_record RECORD;
  parsed jsonb;
  updated_count int := 0;
BEGIN
  FOR customer_record IN 
    SELECT id, shipping_address 
    FROM customers 
    WHERE shipping_address IS NOT NULL 
      AND trim(shipping_address) <> ''
      AND shipping_address1 IS NULL
  LOOP
    parsed := parse_address_to_structured(customer_record.shipping_address);
    
    UPDATE customers
    SET
      shipping_name = parsed->>'name',
      shipping_address1 = parsed->>'address1',
      shipping_address2 = parsed->>'address2',
      shipping_address3 = parsed->>'address3',
      shipping_town = parsed->>'town',
      shipping_postcode = parsed->>'postcode',
      shipping_country = parsed->>'country'
    WHERE id = customer_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % customer shipping addresses', updated_count;
END $$;
