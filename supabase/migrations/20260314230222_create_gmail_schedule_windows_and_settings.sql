/*
  # Create Gmail Settings and Schedule Windows Tables

  ## Summary
  Replaces the rigid peak/off-peak schedule model with a flexible, row-based schedule
  system. Each row in gmail_schedule_windows represents an independent time window
  for a specific day of the week with its own polling interval.

  ## New Tables

  ### 1. `gmail_settings`
  Single-row global configuration for the Gmail integration.
  - `id` - UUID primary key
  - `sync_enabled` - Master on/off toggle for auto-sync
  - `timezone` - IANA timezone string used for schedule evaluation
  - `sync_start_from` - One-time historical floor used ONLY on the very first sync
    (when last_synced_at is NULL). After the first sync completes this is ignored.
  - `max_emails_per_sync` - Cap on emails fetched per sync run (for testing: 1, 2, 5, 10, 20, 50)
  - `created_at`, `updated_at` - Audit timestamps

  ### 2. `gmail_schedule_windows`
  Each row is an independent schedule window.
  - `id` - UUID primary key
  - `enabled` - Whether this window is active
  - `day_of_week` - 0=Sunday through 6=Saturday
  - `start_time` - Window start time (time type)
  - `end_time` - Window end time (time type)
  - `interval_minutes` - How often to sync within this window (5, 10, 15, 30, 60)
  - `sort_order` - Display ordering
  - `created_at`, `updated_at` - Audit timestamps

  ## Security
  - RLS enabled on both tables
  - Super admins only for all operations
  - Matches existing Gmail table security model

  ## Notes
  - Multiple windows per day are fully supported
  - The old gmail_sync_schedule table is left in place to avoid breaking existing data
  - A default gmail_settings row is inserted on creation
*/

CREATE TABLE IF NOT EXISTS gmail_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_enabled boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'UTC',
  sync_start_from timestamptz DEFAULT NULL,
  max_emails_per_sync integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gmail_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can select gmail_settings"
  ON gmail_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert gmail_settings"
  ON gmail_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update gmail_settings"
  ON gmail_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

INSERT INTO gmail_settings (sync_enabled, timezone, sync_start_from, max_emails_per_sync)
VALUES (false, 'UTC', NULL, 10)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS gmail_schedule_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  day_of_week integer NOT NULL DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL DEFAULT '09:00:00',
  end_time time NOT NULL DEFAULT '17:00:00',
  interval_minutes integer NOT NULL DEFAULT 15,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gmail_schedule_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can select gmail_schedule_windows"
  ON gmail_schedule_windows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert gmail_schedule_windows"
  ON gmail_schedule_windows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update gmail_schedule_windows"
  ON gmail_schedule_windows FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete gmail_schedule_windows"
  ON gmail_schedule_windows FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_gmail_schedule_windows_day ON gmail_schedule_windows(day_of_week);
CREATE INDEX IF NOT EXISTS idx_gmail_schedule_windows_enabled ON gmail_schedule_windows(enabled);
