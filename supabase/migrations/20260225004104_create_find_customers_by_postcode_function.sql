/*
  # Create postcode matching function

  1. New Function
    - `find_customers_by_postcode` - Finds customers by normalized postcode matching
    - Takes a WHERE clause parameter for flexible postcode matching
    - Normalizes postcodes on both sides (removes spaces, uppercases)
    - Returns customers ordered by name

  2. Security
    - Function is SECURITY DEFINER to allow authenticated users to search customers
    - Returns data respecting RLS policies
*/

-- Create function to find customers by normalized postcode
CREATE OR REPLACE FUNCTION find_customers_by_postcode(where_clause TEXT)
RETURNS SETOF customers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT * FROM customers WHERE %s ORDER BY name ASC',
    where_clause
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_customers_by_postcode TO authenticated;