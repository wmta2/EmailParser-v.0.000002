import { PostgrestError } from '@supabase/supabase-js';

export interface AppError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function formatSupabaseError(error: PostgrestError | null): AppError | null {
  if (!error) return null;

  return {
    message: error.message || 'An unexpected error occurred',
    code: error.code,
    details: error.details,
    hint: error.hint
  };
}

export function formatGenericError(error: unknown): AppError {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'GENERIC_ERROR'
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      code: 'GENERIC_ERROR'
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  };
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Failed to fetch') ||
           error.message.includes('Network request failed') ||
           error.message.includes('NetworkError');
  }
  return false;
}

export function isAuthError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === '42501' ||
         error.code === 'PGRST301' ||
         error.message.includes('JWT') ||
         error.message.includes('permission denied');
}

export function handleError(error: unknown, context?: string): AppError {
  console.error(`Error${context ? ` in ${context}` : ''}:`, error);

  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return formatSupabaseError(error as PostgrestError) || formatGenericError(error);
  }

  return formatGenericError(error);
}
