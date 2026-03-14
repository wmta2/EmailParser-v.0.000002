/*
  # Update Gmail Sync Cron Function to Use Schedule Windows

  ## Summary
  Replaces the old check_gmail_sync_due() logic (which used the peak/off-peak model
  from gmail_sync_schedule) with a new implementation that reads from the flexible
  gmail_settings and gmail_schedule_windows tables.

  ## Changes

  ### Updated Function: `check_gmail_sync_due()`
  - Reads master sync_enabled flag and timezone from gmail_settings
  - Reads all enabled windows from gmail_schedule_windows
  - Checks current local day-of-week and time against each window
  - If current time falls in any matching window and enough time has elapsed
    since last sync (based on that window's interval_minutes), triggers a sync
  - Uses the existing 1-minute cron job - no re-registration needed

  ## Notes
  - The pg_cron job 'gmail-sync-check' that was created in the previous migration
    continues to run every minute; only the function body changes here
  - pg_net must be available for HTTP calls
*/

CREATE OR REPLACE FUNCTION check_gmail_sync_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_window RECORD;
  v_last_synced timestamptz;
  v_now_local timestamptz;
  v_local_time time;
  v_local_dow integer;
  v_minutes_since_sync float;
  v_project_url text;
  v_service_key text;
  v_triggered boolean := false;
BEGIN
  SELECT * INTO v_settings FROM gmail_settings LIMIT 1;

  IF v_settings IS NULL OR NOT v_settings.sync_enabled THEN
    RETURN;
  END IF;

  SELECT last_synced_at INTO v_last_synced
  FROM gmail_connection
  WHERE connection_status = 'connected'
  LIMIT 1;

  v_now_local := now() AT TIME ZONE v_settings.timezone;
  v_local_time := v_now_local::time;
  v_local_dow := EXTRACT(DOW FROM v_now_local)::integer;

  IF v_last_synced IS NULL THEN
    v_minutes_since_sync := 99999;
  ELSE
    v_minutes_since_sync := EXTRACT(EPOCH FROM (now() - v_last_synced)) / 60.0;
  END IF;

  FOR v_window IN
    SELECT * FROM gmail_schedule_windows
    WHERE enabled = true
    AND day_of_week = v_local_dow
    AND start_time <= v_local_time
    AND end_time > v_local_time
    ORDER BY sort_order
  LOOP
    IF v_minutes_since_sync >= v_window.interval_minutes THEN
      v_triggered := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_triggered THEN
    RETURN;
  END IF;

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
END;
$$;
