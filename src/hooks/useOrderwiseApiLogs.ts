import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ApiLog {
  id: string;
  erp_destination_id: string | null;
  erp_configuration_id: string | null;
  request_type: 'authentication' | 'api_request';
  endpoint: string;
  http_method: string;
  request_headers: Record<string, unknown>;
  request_body: Record<string, unknown> | null;
  response_status: number | null;
  response_headers: Record<string, unknown>;
  response_body: unknown;
  error_message: string | null;
  duration_ms: number | null;
  success: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface LogFilters {
  requestType?: 'all' | 'authentication' | 'api_request';
  success?: 'all' | 'success' | 'failed';
  dateRange?: 'today' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
  searchEndpoint?: string;
}

export interface LogStats {
  total24h: number;
  successRate: number;
  avgDuration: number;
  mostRecentError: string | null;
}

export function useOrderwiseApiLogs(destinationId: string | null, limit = 20) {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LogFilters>({
    requestType: 'all',
    success: 'all',
    dateRange: '7days',
  });

  const fetchLogs = useCallback(async () => {
    if (!destinationId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('erp_api_logs')
        .select('*', { count: 'exact' })
        .eq('erp_destination_id', destinationId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (filters.requestType && filters.requestType !== 'all') {
        query = query.eq('request_type', filters.requestType);
      }

      if (filters.success && filters.success !== 'all') {
        query = query.eq('success', filters.success === 'success');
      }

      if (filters.dateRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (filters.dateRange === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      } else if (filters.dateRange === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      } else if (filters.dateRange === 'custom' && filters.startDate) {
        query = query.gte('created_at', filters.startDate);
        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate);
        }
      }

      if (filters.searchEndpoint) {
        query = query.ilike('endpoint', `%${filters.searchEndpoint}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch API logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [destinationId, page, limit, filters]);

  const fetchStats = useCallback(async () => {
    if (!destinationId) return;

    setLoadingStats(true);
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: recent, error: recentErr } = await supabase
        .from('erp_api_logs')
        .select('success, duration_ms, error_message, created_at')
        .eq('erp_destination_id', destinationId)
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (recentErr) throw recentErr;

      const total = recent?.length || 0;
      const succeeded = recent?.filter(l => l.success).length || 0;
      const successRate = total > 0 ? (succeeded / total) * 100 : 0;

      const durationsWithValues = recent?.filter(l => l.duration_ms !== null).map(l => l.duration_ms) || [];
      const avgDuration = durationsWithValues.length > 0
        ? durationsWithValues.reduce((sum, d) => sum + (d || 0), 0) / durationsWithValues.length
        : 0;

      const failedLogs = recent?.filter(l => !l.success && l.error_message) || [];
      const mostRecentError = failedLogs.length > 0
        ? failedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].error_message
        : null;

      setStats({
        total24h: total,
        successRate: Math.round(successRate),
        avgDuration: Math.round(avgDuration),
        mostRecentError,
      });
    } catch (error) {
      console.error('Failed to fetch log stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [destinationId]);

  const clearOldLogs = useCallback(async (daysToKeep = 30) => {
    try {
      const { data, error } = await supabase.rpc('delete_old_erp_api_logs', {
        days_to_keep: daysToKeep,
      });

      if (error) throw error;

      fetchLogs();
      fetchStats();

      return data;
    } catch (error) {
      console.error('Failed to clear old logs:', error);
      throw error;
    }
  }, [fetchLogs, fetchStats]);

  const subscribeLogs = useCallback(() => {
    if (!destinationId) return null;

    const subscription = supabase
      .channel(`erp_api_logs:${destinationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'erp_api_logs',
          filter: `erp_destination_id=eq.${destinationId}`,
        },
        () => {
          fetchLogs();
          fetchStats();
        }
      )
      .subscribe();

    return subscription;
  }, [destinationId, fetchLogs, fetchStats]);

  useEffect(() => {
    if (destinationId) {
      fetchLogs();
      fetchStats();
    }
  }, [fetchLogs, fetchStats, destinationId]);

  useEffect(() => {
    const subscription = subscribeLogs();
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [subscribeLogs]);

  return {
    logs,
    loading,
    stats,
    loadingStats,
    totalCount,
    page,
    setPage,
    filters,
    setFilters,
    fetchLogs,
    fetchStats,
    clearOldLogs,
  };
}
