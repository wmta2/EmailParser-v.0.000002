/*
  Create Initial Super Admin User

  This creates a super admin user with these credentials:
  Email: admin@example.com
  Password: Admin123!

  IMPORTANT: Change this password immediately after logging in!

  To run this:
  1. Go to your Supabase Dashboard
  2. Navigate to the SQL Editor
  3. Paste this entire script
  4. Click "Run"
*/

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Generate a new user ID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users (Supabase auth table)
  -- This will create the authentication user
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    confirmation_token,
    recovery_token
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@example.com',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated',
    '',
    ''
  )
  ON CONFLICT (email)
  DO UPDATE SET
    encrypted_password = crypt('Admin123!', gen_salt('bf')),
    updated_at = now(),
    email_confirmed_at = now()
  RETURNING id INTO new_user_id;

  -- Get the user_id if it was an update
  IF new_user_id IS NULL THEN
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'admin@example.com';
  END IF;

  -- Insert or update user_profile
  INSERT INTO user_profiles (id, email, role, created_at)
  VALUES (
    new_user_id,
    'admin@example.com',
    'super_admin',
    now()
  )
  ON CONFLICT (id)
  DO UPDATE SET
    role = 'super_admin',
    email = 'admin@example.com';

  RAISE NOTICE 'Super admin user created/updated successfully!';
  RAISE NOTICE 'Email: admin@example.com';
  RAISE NOTICE 'Password: Admin123!';
  RAISE NOTICE 'Please change this password after logging in!';

END $$;
