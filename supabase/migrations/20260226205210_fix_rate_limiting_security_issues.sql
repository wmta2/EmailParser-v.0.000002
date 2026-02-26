/*
  # Fix Rate Limiting Security Issues

  ## Problems
  1. View `rate_limit_violations` has SECURITY DEFINER property (owned by postgres)
     - Allows any authenticated user to see ALL rate limit violations
     - Bypasses RLS and exposes sensitive user data
  
  2. RLS Policy "System can manage rate limits" uses `USING (true)` and `WITH CHECK (true)`
     - Allows ANY authenticated user to INSERT/UPDATE/DELETE rate limit records
     - Completely bypasses rate limiting security
     - Users could delete their own violations or manipulate counters

  ## Solution
  1. Recreate view with SECURITY INVOKER (explicit) so it respects RLS
  2. Drop the overly permissive "System can manage rate limits" policy
  3. Rely solely on SECURITY DEFINER functions to manage rate limit data
  4. Regular users can only SELECT their own rate limit records

  ## Changes
  
  ### 1. Fix Rate Limit Violations View
    - Drop and recreate view with explicit SECURITY INVOKER
    - This ensures the view respects RLS policies
    - Users will only see their own violations through existing SELECT policy
  
  ### 2. Remove Permissive RLS Policy
    - Drop "System can manage rate limits" policy
    - This policy allowed unrestricted access (USING true, WITH CHECK true)
    - Rate limit management now exclusively via SECURITY DEFINER functions
  
  ### 3. Maintain Existing Security
    - "Users can view own rate limits" policy remains (SELECT only)
    - SECURITY DEFINER functions retain their privileges
    - check_rate_limit() continues to manage rate limiting
    - cleanup_old_rate_limits() continues cleanup operations

  ## Security Improvements
  - Users cannot manipulate rate limit counters
  - Users cannot delete rate limit violations
  - Users can only view their own rate limit data
  - View no longer bypasses RLS
  - All write operations restricted to SECURITY DEFINER functions
*/

-- =====================================================
-- 1. FIX RATE LIMIT VIOLATIONS VIEW
-- =====================================================

-- Drop the existing view that has implicit SECURITY DEFINER
DROP VIEW IF EXISTS rate_limit_violations;

-- Recreate with explicit SECURITY INVOKER
-- This ensures the view respects RLS policies on underlying tables
CREATE VIEW rate_limit_violations
WITH (security_invoker = true)
AS
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

-- Grant SELECT permission to authenticated users
-- They will only see their own violations due to RLS on function_rate_limits
GRANT SELECT ON rate_limit_violations TO authenticated;

-- =====================================================
-- 2. REMOVE OVERLY PERMISSIVE RLS POLICY
-- =====================================================

-- Drop the policy that allows unrestricted access (USING true, WITH CHECK true)
-- This was a security vulnerability allowing users to manipulate rate limits
DROP POLICY IF EXISTS "System can manage rate limits" ON function_rate_limits;

/*
  ## Result
  
  After this migration:
  
  1. function_rate_limits table has only ONE policy:
     - "Users can view own rate limits" (SELECT only, WHERE auth.uid() = user_id)
  
  2. rate_limit_violations view respects RLS:
     - Users can only see their own violations
     - No privilege escalation through the view
  
  3. Rate limit management is secure:
     - Only SECURITY DEFINER functions can INSERT/UPDATE/DELETE
     - check_rate_limit() function manages rate limiting
     - cleanup_old_rate_limits() function performs cleanup
     - Regular users have NO write access to rate limit data
  
  ## Verification
  
  To verify the fixes:
  
  ```sql
  -- Check view security mode (should show security_invoker = true)
  SELECT viewname, viewowner, definition
  FROM pg_views
  WHERE viewname = 'rate_limit_violations';
  
  -- Check RLS policies (should only show "Users can view own rate limits")
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE tablename = 'function_rate_limits';
  ```
*/
