/*
  # Add needs_reauth status to gmail_connection

  ## Summary
  Extends the gmail_connection table to support a new connection status value
  that signals the user must re-authorize to grant updated OAuth scopes.

  ## Changes
  - Alters the connection_status check constraint to allow 'needs_reauth'
  - Updates the existing connected account to 'needs_reauth' so the UI
    can prompt the user to re-authorize with the upgraded gmail.modify scope
*/

ALTER TABLE gmail_connection
  DROP CONSTRAINT IF EXISTS gmail_connection_connection_status_check;

ALTER TABLE gmail_connection
  ADD CONSTRAINT gmail_connection_connection_status_check
  CHECK (connection_status IN ('connected', 'disconnected', 'error', 'needs_reauth'));

UPDATE gmail_connection
  SET connection_status = 'needs_reauth',
      updated_at = now()
  WHERE connection_status = 'connected';
