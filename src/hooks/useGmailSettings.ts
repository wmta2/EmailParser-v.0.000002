import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { GmailConnection, GmailSyncSchedule, GmailSyncLog } from '../lib/supabase';

export function useGmailConnection() {
  const [connection, setConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('gmail_connection')
      .select('*')
      .maybeSingle();
    if (err) setError(err.message);
    else setConnection(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConnection(); }, [fetchConnection]);

  const disconnect = async () => {
    if (!connection) return;
    const { error: err } = await supabase
      .from('gmail_connection')
      .update({
        connection_status: 'disconnected',
        access_token: '',
        refresh_token: '',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);
    if (!err) await fetchConnection();
    return err;
  };

  return { connection, loading, error, refetch: fetchConnection, disconnect };
}

export function useGmailSchedule() {
  const [schedule, setSchedule] = useState<GmailSyncSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gmail_sync_schedule')
      .select('*')
      .maybeSingle();
    setSchedule(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const saveSchedule = async (updates: Partial<GmailSyncSchedule>) => {
    setSaving(true);
    let err = null;
    if (schedule) {
      const { error } = await supabase
        .from('gmail_sync_schedule')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', schedule.id);
      err = error;
    } else {
      const { error } = await supabase
        .from('gmail_sync_schedule')
        .insert(updates);
      err = error;
    }
    if (!err) await fetchSchedule();
    setSaving(false);
    return err;
  };

  return { schedule, loading, saving, saveSchedule };
}

export function useGmailSyncLogs(limit = 10) {
  const [logs, setLogs] = useState<GmailSyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gmail_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);
    setLogs(data || []);
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}

export function useGmailSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    emails_found: number;
    emails_imported: number;
    emails_skipped: number;
    emails_failed: number;
    error?: string;
  } | null>(null);

  const syncNow = async () => {
    setSyncing(true);
    setLastResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
          'Apikey': anonKey,
        },
        body: JSON.stringify({ sync_type: 'manual' }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLastResult({ success: false, emails_found: 0, emails_imported: 0, emails_skipped: 0, emails_failed: 0, error: data.error || 'Sync failed' });
      } else {
        setLastResult({
          success: true,
          emails_found: data.emails_found || 0,
          emails_imported: data.emails_imported || 0,
          emails_skipped: data.emails_skipped || 0,
          emails_failed: data.emails_failed || 0,
        });
      }
    } catch (err) {
      setLastResult({ success: false, emails_found: 0, emails_imported: 0, emails_skipped: 0, emails_failed: 0, error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSyncing(false);
    }
  };

  return { syncing, lastResult, syncNow };
}

export function useGmailOAuth() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthUrl = async (): Promise<string | null> => {
    setConnecting(true);
    setError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-auth-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
          'Apikey': anonKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to get auth URL');
        return null;
      }

      return data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setConnecting(false);
    }
  };

  const handleCallback = async (code: string): Promise<boolean> => {
    setConnecting(true);
    setError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
          'Apikey': anonKey,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to connect Gmail account');
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setConnecting(false);
    }
  };

  return { connecting, error, getAuthUrl, handleCallback };
}
