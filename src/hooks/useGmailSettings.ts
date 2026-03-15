import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { GmailConnection, GmailSyncSchedule, GmailSyncLog, GmailSettings, GmailScheduleWindow } from '../lib/supabase';

export type { GmailSettings, GmailScheduleWindow };

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
    search_after?: string;
    checkpoint_source?: string;
    debug?: string[];
    error?: string;
  } | null>(null);

  const runSync = async (resetCheckpoint = false) => {
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
        body: JSON.stringify({ sync_type: 'manual', reset_checkpoint: resetCheckpoint }),
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
          search_after: data.search_after,
          checkpoint_source: data.checkpoint_source,
          debug: data.debug,
        });
      }
    } catch (err) {
      setLastResult({ success: false, emails_found: 0, emails_imported: 0, emails_skipped: 0, emails_failed: 0, error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSyncing(false);
    }
  };

  const syncNow = () => runSync(false);
  const syncWithReset = () => runSync(true);

  return { syncing, lastResult, syncNow, syncWithReset };
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

export function useGmailSettingsConfig() {
  const [settings, setSettings] = useState<GmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gmail_settings')
      .select('*')
      .maybeSingle();
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (updates: Partial<GmailSettings>) => {
    setSaving(true);
    let err = null;
    if (settings) {
      const { error } = await supabase
        .from('gmail_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', settings.id);
      err = error;
    } else {
      const { error } = await supabase
        .from('gmail_settings')
        .insert(updates);
      err = error;
    }
    if (!err) await fetchSettings();
    setSaving(false);
    return err;
  };

  return { settings, loading, saving, saveSettings, refetch: fetchSettings };
}

export function useGmailScheduleWindows() {
  const [windows, setWindows] = useState<GmailScheduleWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWindows = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gmail_schedule_windows')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('sort_order', { ascending: true });
    setWindows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWindows(); }, [fetchWindows]);

  const saveWindows = async (
    toUpsert: Omit<GmailScheduleWindow, 'created_at' | 'updated_at'>[],
    toDelete: string[]
  ) => {
    setSaving(true);
    let err = null;

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('gmail_schedule_windows')
        .delete()
        .in('id', toDelete);
      if (error) err = error;
    }

    if (!err && toUpsert.length > 0) {
      const now = new Date().toISOString();
      const rows = toUpsert.map(w => ({ ...w, updated_at: now }));
      const { error } = await supabase
        .from('gmail_schedule_windows')
        .upsert(rows, { onConflict: 'id' });
      if (error) err = error;
    }

    if (!err) await fetchWindows();
    setSaving(false);
    return err;
  };

  return { windows, loading, saving, saveWindows, refetch: fetchWindows };
}
