/*
  # Fix Function Search Paths

  1. Purpose
    - Set immutable search_path for all functions to prevent search path injection attacks
    - Functions should explicitly reference public schema

  2. Functions Modified
    - update_customers_updated_at
    - update_template_sample_emails_updated_at
    - delete_old_erp_api_logs
    - parse_address_to_structured
    - update_updated_at_column

  3. Security
    - Setting search_path to 'public' prevents malicious schema injection
*/

-- Update update_customers_updated_at function
CREATE OR REPLACE FUNCTION public.update_customers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update update_template_sample_emails_updated_at function
CREATE OR REPLACE FUNCTION public.update_template_sample_emails_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update delete_old_erp_api_logs function
CREATE OR REPLACE FUNCTION public.delete_old_erp_api_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.erp_api_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NULL;
END;
$$;

-- Drop and recreate parse_address_to_structured function with correct search_path
DROP FUNCTION IF EXISTS public.parse_address_to_structured(text);

CREATE FUNCTION public.parse_address_to_structured(address_text text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  lines text[];
  result jsonb;
  line_count int;
BEGIN
  IF address_text IS NULL OR address_text = '' THEN
    RETURN jsonb_build_object(
      'line1', '',
      'line2', '',
      'city', '',
      'county', '',
      'postcode', '',
      'country', 'United Kingdom'
    );
  END IF;

  lines := string_to_array(regexp_replace(address_text, E'\\r\\n|\\r', E'\n', 'g'), E'\n');
  lines := array_remove(lines, '');
  line_count := array_length(lines, 1);

  result := jsonb_build_object(
    'line1', COALESCE(lines[1], ''),
    'line2', CASE WHEN line_count > 2 THEN COALESCE(lines[2], '') ELSE '' END,
    'city', CASE 
      WHEN line_count >= 4 THEN COALESCE(lines[line_count - 2], '')
      WHEN line_count = 3 THEN COALESCE(lines[2], '')
      ELSE ''
    END,
    'county', '',
    'postcode', CASE WHEN line_count >= 2 THEN COALESCE(lines[line_count - 1], '') ELSE '' END,
    'country', COALESCE(lines[line_count], 'United Kingdom')
  );

  RETURN result;
END;
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
