/*
  # Enable pg_cron and Create Gmail Sync Scheduler

  ## Summary
  This migration enables the pg_cron extension and sets up a function that runs every
  minute to check whether it is time to trigger a Gmail sync based on the configured schedule.

  ## Changes

  ### 1. Enable pg_cron Extension
  Enables pg_cron in the extensions schema for safe scheduling.

  ### 2. Function: `check_gmail_sync_due()`
  A SQL function that:
  - Reads the current gmail_sync_schedule configuration
  - Determines if we are in peak or off-peak hours based on local time
  - Checks if enough time has elapsed since the last sync
  - If due, calls the gmail-sync Edge Function via net.http_post
  - Only runs if auto-sync is enabled

  ### 3. pg_cron Job
  Registers a cron job that runs `check_gmail_sync_due()` every minute.
  The function itself decides if it actually needs to trigger a sync,
  so no multiple cron entries are needed for different intervals.

  ## Notes
  - pg_net extension is required for HTTP calls from SQL functions
  - The Edge Function URL is constructed from the Supabase project URL environment variable
  - Schedule intervals are fully controlled via the gmail_sync_schedule table in the UI
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION check_gmail_sync_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_last_synced timestamptz;
  v_now_local time;
  v_is_peak boolean;
  v_interval_minutes integer;
  v_minutes_since_sync float;
  v_project_url text;
  v_service_key text;
BEGIN
  SELECT * INTO v_schedule FROM gmail_sync_schedule LIMIT 1;

  IF v_schedule IS NULL OR NOT v_schedule.enabled THEN
    RETURN;
  END IF;

  SELECT last_synced_at INTO v_last_synced
  FROM gmail_connection
  WHERE connection_status = 'connected'
  LIMIT 1;

  v_now_local := (now() AT TIME ZONE v_schedule.timezone)::time;

  v_is_peak := v_now_local >= v_schedule.peak_start_time
    AND v_now_local < v_schedule.peak_end_time;

  v_interval_minutes := CASE
    WHEN v_is_peak THEN v_schedule.peak_interval_minutes
    ELSE v_schedule.off_peak_interval_minutes
  END;

  IF v_last_synced IS NULL THEN
    v_minutes_since_sync := v_interval_minutes + 1;
  ELSE
    v_minutes_since_sync := EXTRACT(EPOCH FROM (now() - v_last_synced)) / 60.0;
  END IF;

  IF v_minutes_since_sync >= v_interval_minutes THEN
    v_project_url := current_setting('app.supabase_url', true);
    v_service_key := current_setting('app.service_role_key', true);

    IF v_project_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/gmail-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object('sync_type', 'scheduled')
      );
    END IF;
  END IF;
END;
$$;

SELECT cron.schedule(
  'gmail-sync-check',
  '* * * * *',
  'SELECT check_gmail_sync_due()'
);
