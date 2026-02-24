/*
  # Add is_disabled column to user_profiles

  1. Changes
    - Add `is_disabled` boolean column to `user_profiles` table
    - Default value is `false` (users are enabled by default)
    - This allows admins to disable user accounts without deleting them

  2. Security
    - Only super_admin and admin users can update this field (via existing RLS policies)
*/

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_disabled boolean DEFAULT false NOT NULL;