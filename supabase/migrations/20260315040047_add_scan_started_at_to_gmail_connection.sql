/*
  # Add scan_started_at to gmail_connection

  ## Summary
  Adds a `scan_started_at` column to `gmail_connection` to track when a paginated
  initial scan began. This solves the pagination resume bug where `next_page_token`
  was discarded on every run because `last_synced_at` is always null during the
  first full scan.

  ## Changes
  - `gmail_connection` table:
    - New column `scan_started_at` (timestamptz, nullable): set when a fresh paginated
      scan begins; cleared when all pages are exhausted and `last_synced_at` is written.

  ## How it is used
  - On first run (no prior checkpoint): write `scan_started_at = now()` and save the
    page token after processing the first batch.
  - On subsequent runs: if `scan_started_at` is set and a `next_page_token` exists,
    resume from that token regardless of `last_synced_at`.
  - When all pages are consumed: clear `scan_started_at` and write `last_synced_at`.
  - On explicit reset or rule-filter change: clear both `scan_started_at` and
    `next_page_token` so a fresh scan starts from the beginning.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connection' AND column_name = 'scan_started_at'
  ) THEN
    ALTER TABLE gmail_connection ADD COLUMN scan_started_at timestamptz DEFAULT NULL;
  END IF;
END $$;
