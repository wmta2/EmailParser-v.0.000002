import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { PostgrestError } from '@supabase/supabase-js';

export interface SupabaseQueryOptions<T> {
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: PostgrestError) => void;
}

export interface SupabaseQueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useSupabaseQuery<T>(
  options: SupabaseQueryOptions<T>
): SupabaseQueryResult<T> {
  const { queryFn, enabled = true, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();

      if (result.error) {
        setError(result.error);
        if (onError) {
          onError(result.error);
        }
      } else {
        setData(result.data);
        if (onSuccess && result.data) {
          onSuccess(result.data);
        }
      }
    } catch (err) {
      const postgrestError: PostgrestError = {
        message: err instanceof Error ? err.message : 'Unknown error',
        details: '',
        hint: '',
        code: 'UNKNOWN'
      };
      setError(postgrestError);
      if (onError) {
        onError(postgrestError);
      }
    } finally {
      setLoading(false);
    }
  }, [queryFn, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    error,
    loading,
    refetch: fetchData
  };
}
