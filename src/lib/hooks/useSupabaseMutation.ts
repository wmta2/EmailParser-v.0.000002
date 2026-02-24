import { useState, useCallback } from 'react';
import { PostgrestError } from '@supabase/supabase-js';

export interface SupabaseMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: PostgrestError | null }>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: PostgrestError, variables: TVariables) => void;
}

export interface SupabaseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<{ data: TData | null; error: PostgrestError | null }>;
  data: TData | null;
  error: PostgrestError | null;
  loading: boolean;
  reset: () => void;
}

export function useSupabaseMutation<TData = unknown, TVariables = unknown>(
  options: SupabaseMutationOptions<TData, TVariables>
): SupabaseMutationResult<TData, TVariables> {
  const { mutationFn, onSuccess, onError } = options;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const mutate = useCallback(async (variables: TVariables) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await mutationFn(variables);

      if (result.error) {
        setError(result.error);
        if (onError) {
          onError(result.error, variables);
        }
      } else {
        setData(result.data);
        if (onSuccess && result.data) {
          await onSuccess(result.data, variables);
        }
      }

      return result;
    } catch (err) {
      const postgrestError: PostgrestError = {
        message: err instanceof Error ? err.message : 'Unknown error',
        details: '',
        hint: '',
        code: 'UNKNOWN'
      };
      setError(postgrestError);
      if (onError) {
        onError(postgrestError, variables);
      }
      return { data: null, error: postgrestError };
    } finally {
      setLoading(false);
    }
  }, [mutationFn, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    data,
    error,
    loading,
    reset
  };
}
