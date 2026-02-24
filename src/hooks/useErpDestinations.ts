import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  type ErpDestination,
  type ErpConfiguration,
  type ErpService,
  type ErpSyncLog,
} from '../lib/supabase';

export function useErpDestinations() {
  const [destinations, setDestinations] = useState<ErpDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDestinations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('erp_destinations')
        .select('*')
        .order('priority', { ascending: true });

      if (err) throw err;
      setDestinations(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ERP destinations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  async function toggleDestination(id: string, enabled: boolean) {
    const { error: err } = await supabase
      .from('erp_destinations')
      .update({ enabled })
      .eq('id', id);

    if (err) throw err;
    await fetchDestinations();
  }

  return { destinations, loading, error, fetchDestinations, toggleDestination };
}

export function useErpConfig(destinationId: string | null) {
  const [config, setConfig] = useState<ErpConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!destinationId) {
      setConfig(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('erp_configurations')
        .select('*')
        .eq('erp_destination_id', destinationId)
        .maybeSingle();

      if (err) throw err;
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function saveConfig(configData: Record<string, any>, credentials: Record<string, any>) {
    if (!destinationId) return;

    if (config) {
      const { error: err } = await supabase
        .from('erp_configurations')
        .update({ config_data: configData, credentials, updated_at: new Date().toISOString() })
        .eq('erp_destination_id', destinationId);

      if (err) throw err;
    } else {
      const { error: err } = await supabase
        .from('erp_configurations')
        .insert({ erp_destination_id: destinationId, config_data: configData, credentials });

      if (err) throw err;
    }

    await fetchConfig();
  }

  async function updateSyncStatus(status: string) {
    if (!config) return;
    await supabase
      .from('erp_configurations')
      .update({
        sync_status: status,
        ...(status === 'idle' ? { last_sync_at: new Date().toISOString() } : {}),
      })
      .eq('id', config.id);
  }

  return { config, loading, error, fetchConfig, saveConfig, updateSyncStatus };
}

export function useErpServices(destinationId: string | null) {
  const [services, setServices] = useState<ErpService[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    if (!destinationId) {
      setServices([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await supabase
        .from('erp_services')
        .select('*')
        .eq('erp_destination_id', destinationId)
        .order('service_name', { ascending: true });

      setServices(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  async function toggleService(serviceId: string, enabled: boolean) {
    const { error: err } = await supabase
      .from('erp_services')
      .update({ enabled })
      .eq('id', serviceId);

    if (err) throw err;
    await fetchServices();
  }

  return { services, loading, fetchServices, toggleService };
}

export function useErpSyncLogs(destinationId: string | null, limit = 20) {
  const [logs, setLogs] = useState<ErpSyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!destinationId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await supabase
        .from('erp_sync_log')
        .select('*')
        .eq('erp_destination_id', destinationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      setLogs(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [destinationId, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, fetchLogs };
}
