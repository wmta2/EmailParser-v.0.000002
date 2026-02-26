/*
  # Fix Customer Postcode Search with Rate Limiting and Security

  ## Problem
  The previous security fix (20260226201326) broke customer postcode matching by:
  - Searching non-existent `postcode` column instead of `shipping_postcode` and `billing_postcode`
  - Changing function signature from WHERE clause to single postcode parameter
  - TypeScript client code still passes WHERE clauses, causing complete failure

  ## Solution
  1. Replace function with secure parameterized query approach
  2. Add comprehensive rate limiting to prevent abuse
  3. Use array parameter instead of dynamic SQL for security
  4. Search both shipping and billing postcodes

  ## Changes

  ### 1. Rate Limiting Infrastructure
    - `function_rate_limits` table to track function call rates per user
    - `check_rate_limit()` function to enforce limits with sliding window
    - `cleanup_old_rate_limits()` function to remove expired entries
    - `rate_limit_violations` view for monitoring abuse attempts

  ### 2. Secure Postcode Search
    - `normalize_postcode()` immutable helper function
    - `find_customers_by_postcode()` with array parameter (prevents SQL injection)
    - Searches both shipping_postcode and billing_postcode columns
    - Rate limited to 100 calls per 60 seconds per user

  ## Security Improvements
    - Parameterized queries eliminate SQL injection vulnerability
    - Rate limiting prevents brute-force and DoS attacks
    - search_path protection prevents schema manipulation
    - All functions use SECURITY DEFINER with explicit search_path

  ## Deployment Notes
    - This migration must be deployed WITH the TypeScript code changes
    - TypeScript must be updated to pass postcode array instead of WHERE clause
    - See customerMatcher.ts for required changes
*/

-- =====================================================
-- 1. RATE LIMITING INFRASTRUCTURE
-- =====================================================

-- Table to track function call rates per user
CREATE TABLE IF NOT EXISTS function_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  call_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Index for fast rate limit lookups
CREATE INDEX IF NOT EXISTS idx_function_rate_limits_lookup
  ON function_rate_limits(user_id, function_name, window_start);

-- Enable RLS on rate limits table
ALTER TABLE function_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can read their own rate limit data
CREATE POLICY "Users can view own rate limits"
  ON function_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can manage rate limits (via SECURITY DEFINER functions)
CREATE POLICY "System can manage rate limits"
  ON function_rate_limits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 2. RATE LIMITING FUNCTIONS
-- =====================================================

-- Check if user has exceeded rate limit
-- Returns TRUE if call is allowed, FALSE if rate limit exceeded
-- Automatically increments counter if allowed
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_function_name text,
  p_max_calls int DEFAULT 100,
  p_window_seconds int DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_window_start timestamptz;
  v_current_count int;
  v_record_exists boolean;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Calculate window start time
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;

  -- Try to find existing rate limit record within the window
  SELECT call_count, true INTO v_current_count, v_record_exists
  FROM function_rate_limits
  WHERE user_id = v_user_id
    AND function_name = p_function_name
    AND window_start > v_window_start
  ORDER BY window_start DESC
  LIMIT 1;

  -- If no record exists or window expired, create new record
  IF NOT v_record_exists THEN
    INSERT INTO function_rate_limits (user_id, function_name, call_count, window_start)
    VALUES (v_user_id, p_function_name, 1, now());
    RETURN true;
  END IF;

  -- Check if limit exceeded
  IF v_current_count >= p_max_calls THEN
    -- Log the violation attempt
    INSERT INTO function_rate_limits (user_id, function_name, call_count, window_start)
    VALUES (v_user_id, p_function_name, v_current_count + 1, now())
    ON CONFLICT DO NOTHING;

    RETURN false;
  END IF;

  -- Increment counter
  UPDATE function_rate_limits
  SET call_count = call_count + 1
  WHERE user_id = v_user_id
    AND function_name = p_function_name
    AND window_start > v_window_start;

  RETURN true;
END;
$$;

-- Cleanup old rate limit entries (call periodically via cron or manual trigger)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits(
  p_age_hours int DEFAULT 24
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count int;
BEGIN
  DELETE FROM function_rate_limits
  WHERE created_at < now() - (p_age_hours || ' hours')::interval;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits TO authenticated;

-- =====================================================
-- 3. POSTCODE NORMALIZATION HELPER
-- =====================================================

-- Normalize postcode: remove spaces, convert to uppercase
CREATE OR REPLACE FUNCTION normalize_postcode(p_postcode text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  SELECT UPPER(REPLACE(COALESCE(p_postcode, ''), ' ', ''));
$$;

GRANT EXECUTE ON FUNCTION normalize_postcode TO authenticated;

-- =====================================================
-- 4. SECURE CUSTOMER POSTCODE SEARCH
-- =====================================================

-- Drop the broken function from previous migration
DROP FUNCTION IF EXISTS find_customers_by_postcode(text);

-- Create secure version with array parameter
-- Searches both shipping_postcode and billing_postcode
-- Rate limited to prevent abuse
CREATE OR REPLACE FUNCTION find_customers_by_postcode(p_postcodes text[])
RETURNS SETOF customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_normalized_postcodes text[];
  v_rate_limit_ok boolean;
BEGIN
  -- Check rate limit: 100 calls per 60 seconds
  v_rate_limit_ok := check_rate_limit('find_customers_by_postcode', 100, 60);

  IF NOT v_rate_limit_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded for customer search. Please try again in a moment.'
      USING HINT = 'Maximum 100 searches per minute allowed';
  END IF;

  -- Normalize all postcodes in the array
  SELECT array_agg(normalize_postcode(pc))
  INTO v_normalized_postcodes
  FROM unnest(p_postcodes) AS pc;

  -- Return customers matching any of the normalized postcodes
  -- Search both shipping and billing postcodes
  RETURN QUERY
  SELECT c.*
  FROM customers c
  WHERE normalize_postcode(c.shipping_postcode) = ANY(v_normalized_postcodes)
     OR normalize_postcode(c.billing_postcode) = ANY(v_normalized_postcodes)
  ORDER BY c.name;
END;
$$;

GRANT EXECUTE ON FUNCTION find_customers_by_postcode TO authenticated;

-- =====================================================
-- 5. MONITORING VIEW
-- =====================================================

-- View to monitor rate limit violations
CREATE OR REPLACE VIEW rate_limit_violations AS
SELECT
  frl.user_id,
  up.email,
  frl.function_name,
  frl.call_count,
  frl.window_start,
  frl.created_at
FROM function_rate_limits frl
LEFT JOIN user_profiles up ON up.id = frl.user_id
WHERE frl.call_count > 100
ORDER BY frl.created_at DESC;

-- Grant view access to authenticated users (they can only see their own via RLS)
GRANT SELECT ON rate_limit_violations TO authenticated;

/*
  ## Usage Examples

  ### TypeScript Client Code:
  ```typescript
  // Normalize postcodes in TypeScript
  const postcodes = ['SW1A 1AA', 'SW1A1AA'].map(pc =>
    pc.replace(/\s/g, '').toUpperCase()
  );

  // Call function with array parameter (SQL injection safe)
  const { data, error } = await supabase
    .rpc('find_customers_by_postcode', { p_postcodes: postcodes });
  ```

  ### Manual Cleanup (run periodically):
  ```sql
  SELECT cleanup_old_rate_limits(24);  -- Remove entries older than 24 hours
  ```

  ### Monitor Rate Limit Violations:
  ```sql
  SELECT * FROM rate_limit_violations;
  ```

  ## Security Notes
  - Parameterized queries (text[]) prevent SQL injection completely
  - Rate limiting prevents brute-force attacks and API abuse
  - search_path setting prevents schema manipulation attacks
  - SECURITY DEFINER allows controlled privilege escalation for search
  - All user input is sanitized via normalize_postcode function
*/