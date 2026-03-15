/*
  # Add platform field to gmail_import_rules

  ## Summary
  Adds a nullable `platform` text column to the `gmail_import_rules` table.

  ## Changes
  ### Modified Tables
  - `gmail_import_rules`
    - New column: `platform` (text, nullable) — when set, emails matched by this rule
      will have their `raw_email.platform` field populated with this value instead of
      the default "gmail". Allows tagging imported emails per sender/platform.

  ## Notes
  - Existing rules are unaffected (platform defaults to NULL, falls back to "gmail")
  - No constraints on the value — free-text to allow any platform name
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_import_rules' AND column_name = 'platform'
  ) THEN
    ALTER TABLE gmail_import_rules ADD COLUMN platform text DEFAULT NULL;
  END IF;
END $$;
