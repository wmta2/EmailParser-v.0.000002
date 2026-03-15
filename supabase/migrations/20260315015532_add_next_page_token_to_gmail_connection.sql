/*
  # Add next_page_token to gmail_connection

  ## Summary
  Adds a pagination cursor column to the gmail_connection table so the Gmail sync
  function can remember where it left off when paginating through large batches of
  historical emails.

  ## Changes
  ### Modified Tables
  - `gmail_connection`
    - `next_page_token` (text, nullable) — stores Gmail's nextPageToken between sync
      runs so the next batch picks up exactly where the last one stopped.

  ## Notes
  1. Nullable — null means "start from the beginning / use date-based query".
  2. Cleared alongside last_synced_at when a reset_checkpoint is triggered.
  3. Cleared once Gmail returns no further pages (scan complete).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connection' AND column_name = 'next_page_token'
  ) THEN
    ALTER TABLE gmail_connection ADD COLUMN next_page_token text DEFAULT NULL;
  END IF;
END $$;
