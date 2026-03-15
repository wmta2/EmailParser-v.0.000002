/*
  # Add start_mode to gmail_settings

  ## Summary
  Adds a `start_mode` column to the `gmail_settings` table to store the user's chosen
  import starting point. This mirrors the "Choose where to start" workflow from make.com.

  ## Changes

  ### Modified Tables

  #### `gmail_settings`
  - `start_mode` (text, nullable) - One of: 'from_now', 'specific_date', 'all', 'manually'
    - `from_now` - Only fetch emails received after the mode was saved
    - `specific_date` - Use the existing sync_start_from date as the floor
    - `all` - Fetch all emails with no date filter
    - `manually` - User controls syncing; behaves like incremental sync (no reset)
    - NULL - Not yet chosen (falls back to legacy behaviour)

  ## Notes
  - The existing `sync_start_from` column is kept because it is still needed when
    start_mode = 'specific_date'.
  - No data migration needed; existing rows will have start_mode = NULL which the
    edge function treats as the old fallback path.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_settings' AND column_name = 'start_mode'
  ) THEN
    ALTER TABLE gmail_settings ADD COLUMN start_mode text DEFAULT NULL
      CHECK (start_mode IN ('from_now', 'specific_date', 'all', 'manually'));
  END IF;
END $$;
