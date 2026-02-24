/*
  # Fix User Registration Trigger

  1. Changes
    - Recreate the handle_new_user() function with proper permissions
    - The function now properly bypasses RLS with SECURITY DEFINER
    - Add explicit grants for the function to access both tables
    - Improve error handling in the trigger function

  2. Security
    - Function runs with definer's rights to bypass RLS
    - Only triggered on new user creation from auth.users
    - Cannot be called directly by users
*/

-- Drop and recreate the trigger function with proper permissions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the role from invitation if exists
  SELECT role INTO user_role
  FROM public.invitations
  WHERE email = NEW.email 
  AND used = false 
  LIMIT 1;
  
  -- If no invitation found, default to 'user'
  IF user_role IS NULL THEN
    user_role := 'user';
  END IF;
  
  -- Insert the user profile
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, user_role);
  
  -- Mark invitation as used if it exists
  UPDATE public.invitations
  SET used = true
  WHERE email = NEW.email 
  AND used = false;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_profiles TO postgres, service_role;
GRANT ALL ON public.invitations TO postgres, service_role;