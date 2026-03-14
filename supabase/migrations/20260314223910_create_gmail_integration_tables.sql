/*
  # Create Gmail Integration Tables

  ## Summary
  This migration creates all tables needed for the Gmail email integration feature.

  ## New Tables

  ### 1. `gmail_connection`
  Stores the OAuth connection details for the linked Gmail account.
  - `id` - UUID primary key
  - `gmail_address` - The connected Gmail email address
  - `access_token` - Current OAuth access token (encrypted at rest via Supabase)
  - `refresh_token` - OAuth refresh token for renewing access (encrypted at rest)
  - `token_expires_at` - Timestamp when the access token expires
  - `connection_status` - One of: 'connected', 'disconnected', 'error'
  - `last_synced_at` - Timestamp of the last successful sync run
  - `error_message` - Last error message if status is 'error'
  - `created_at`, `updated_at` - Audit timestamps

  ### 2. `gmail_import_rules`
  Defines ordered rules for filtering and routing incoming emails.
  - `id` - UUID primary key
  - `name` - Human-readable rule name
  - `priority` - Integer sort order (lower = higher priority)
  - `enabled` - Whether the rule is active
  - `match_field` - Which field to match: 'sender', 'subject', 'body'
  - `match_type` - How to match: 'contains', 'exact', 'starts_with', 'regex'
  - `match_value` - The value to match against
  - `action` - What to do: 'import_only', 'parse_with_template', 'skip'
  - `template_id` - FK to email_template_patterns (for parse_with_template action)
  - `created_at`, `updated_at` - Audit timestamps

  ### 3. `gmail_sync_schedule`
  Stores the scheduling configuration for automated syncs.
  - `id` - UUID primary key
  - `enabled` - Whether auto-sync is active
  - `peak_start_time` - Time when peak hours begin (e.g., '08:00:00')
  - `peak_end_time` - Time when peak hours end (e.g., '18:00:00')
  - `peak_interval_minutes` - Check frequency during peak hours (default 15)
  - `off_peak_interval_minutes` - Check frequency during off-peak hours (default 60)
  - `timezone` - IANA timezone string (default 'UTC')
  - `created_at`, `updated_at` - Audit timestamps

  ### 4. `gmail_sync_log`
  Records each sync run for audit and debugging purposes.
  - `id` - UUID primary key
  - `sync_type` - 'manual' or 'scheduled'
  - `status` - 'running', 'success', 'partial', 'failed'
  - `emails_found` - Total emails fetched from Gmail API
  - `emails_imported` - Emails successfully saved to raw_email
  - `emails_skipped` - Emails skipped by rules
  - `emails_failed` - Emails that caused errors during import
  - `error_message` - Top-level error if sync failed entirely
  - `error_details` - JSONB for detailed error info
  - `started_at`, `completed_at` - Timing info

  ## Security
  - RLS enabled on all tables
  - Only super_admin role can manage Gmail connection and rules
  - sync_log is readable by authenticated users for visibility
  - All write operations restricted to super_admin
*/

CREATE TABLE IF NOT EXISTS gmail_connection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_address text DEFAULT '',
  access_token text DEFAULT '',
  refresh_token text DEFAULT '',
  token_expires_at timestamptz DEFAULT now(),
  connection_status text DEFAULT 'disconnected',
  last_synced_at timestamptz DEFAULT NULL,
  error_message text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gmail_connection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can select gmail_connection"
  ON gmail_connection FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert gmail_connection"
  ON gmail_connection FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update gmail_connection"
  ON gmail_connection FOR UPDATE
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

CREATE TABLE IF NOT EXISTS gmail_import_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  priority integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  match_field text NOT NULL DEFAULT 'sender',
  match_type text NOT NULL DEFAULT 'contains',
  match_value text NOT NULL DEFAULT '',
  action text NOT NULL DEFAULT 'import_only',
  template_id uuid DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gmail_import_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can select gmail_import_rules"
  ON gmail_import_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert gmail_import_rules"
  ON gmail_import_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update gmail_import_rules"
  ON gmail_import_rules FOR UPDATE
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

CREATE POLICY "Super admins can delete gmail_import_rules"
  ON gmail_import_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_gmail_import_rules_priority ON gmail_import_rules(priority ASC);
CREATE INDEX IF NOT EXISTS idx_gmail_import_rules_enabled ON gmail_import_rules(enabled);

CREATE TABLE IF NOT EXISTS gmail_sync_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  peak_start_time time NOT NULL DEFAULT '08:00:00',
  peak_end_time time NOT NULL DEFAULT '18:00:00',
  peak_interval_minutes integer NOT NULL DEFAULT 15,
  off_peak_interval_minutes integer NOT NULL DEFAULT 60,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gmail_sync_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can select gmail_sync_schedule"
  ON gmail_sync_schedule FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert gmail_sync_schedule"
  ON gmail_sync_schedule FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update gmail_sync_schedule"
  ON gmail_sync_schedule FOR UPDATE
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

INSERT INTO gmail_sync_schedule (enabled, peak_start_time, peak_end_time, peak_interval_minutes, off_peak_interval_minutes, timezone)
VALUES (false, '08:00:00', '18:00:00', 15, 60, 'UTC')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS gmail_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'running',
  emails_found integer NOT NULL DEFAULT 0,
  emails_imported integer NOT NULL DEFAULT 0,
  emails_skipped integer NOT NULL DEFAULT 0,
  emails_failed integer NOT NULL DEFAULT 0,
  error_message text DEFAULT NULL,
  error_details jsonb DEFAULT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gmail_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select gmail_sync_log"
  ON gmail_sync_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert gmail_sync_log"
  ON gmail_sync_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update gmail_sync_log"
  ON gmail_sync_log FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_gmail_sync_log_started_at ON gmail_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_log_status ON gmail_sync_log(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'raw_email' AND column_name = 'gmail_message_id'
  ) THEN
    ALTER TABLE raw_email ADD COLUMN gmail_message_id text DEFAULT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_email_gmail_message_id ON raw_email(gmail_message_id) WHERE gmail_message_id IS NOT NULL;
  END IF;
END $$;
