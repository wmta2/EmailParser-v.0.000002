import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  type SalesChannel,
  type ChannelConfiguration,
  type ChannelSyncLog,
} from '../lib/supabase';

export function useChannels() {
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('sales_channels')
        .select('*')
        .order('priority', { ascending: true });

      if (err) throw err;
      setChannels(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  async function toggleChannel(id: string, enabled: boolean) {
    const { error: err } = await supabase
      .from('sales_channels')
      .update({ enabled })
      .eq('id', id);

    if (err) throw err;
    await fetchChannels();
  }

  return { channels, loading, error, fetchChannels, toggleChannel };
}

export function useChannelConfig(channelId: string | null) {
  const [config, setConfig] = useState<ChannelConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!channelId) {
      setConfig(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('channel_configurations')
        .select('*')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (err) throw err;
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function saveConfig(configData: Record<string, any>, credentials: Record<string, any>) {
    if (!channelId) return;

    if (config) {
      const { error: err } = await supabase
        .from('channel_configurations')
        .update({ config_data: configData, credentials })
        .eq('channel_id', channelId);

      if (err) throw err;
    } else {
      const { error: err } = await supabase
        .from('channel_configurations')
        .insert({ channel_id: channelId, config_data: configData, credentials });

      if (err) throw err;
    }

    await fetchConfig();
  }

  async function updateSyncStatus(status: string) {
    if (!config) return;
    await supabase
      .from('channel_configurations')
      .update({ sync_status: status, last_sync_at: status === 'idle' ? new Date().toISOString() : config.last_sync_at })
      .eq('id', config.id);
  }

  return { config, loading, error, fetchConfig, saveConfig, updateSyncStatus };
}

export function useChannelSyncLog(channelId: string | null, limit = 20) {
  const [logs, setLogs] = useState<ChannelSyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!channelId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await supabase
        .from('channel_sync_log')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(limit);

      setLogs(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [channelId, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, fetchLogs };
}

export function useAllSyncLogs(limit = 50) {
  const [logs, setLogs] = useState<(ChannelSyncLog & { channel_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);

      const { data: logData } = await supabase
        .from('channel_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data: channels } = await supabase
        .from('sales_channels')
        .select('id, name, icon_name');

      const channelMap = new Map((channels ?? []).map(c => [c.id, c]));

      const enriched = (logData ?? []).map(log => ({
        ...log,
        channel_name: channelMap.get(log.channel_id)?.name ?? 'Unknown',
        channel_icon: channelMap.get(log.channel_id)?.icon_name ?? 'Box',
      }));

      setLogs(enriched);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, fetchLogs };
}
