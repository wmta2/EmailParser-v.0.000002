import { PostgrestError } from '@supabase/supabase-js';

export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection and try again.',
  AUTH: 'Authentication error. Please log in again.',
  PERMISSION: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  GENERIC: 'An unexpected error occurred. Please try again.',
  TIMEOUT: 'The request timed out. Please try again.',
  SERVER: 'Server error. Please try again later.',
} as const;

export function getUserFriendlyErrorMessage(error: PostgrestError | null | unknown): string {
  if (!error) return ERROR_MESSAGES.GENERIC;

  if (typeof error === 'string') return error;

  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      return ERROR_MESSAGES.NETWORK;
    }
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT;
    }
    return error.message;
  }

  const postgrestError = error as PostgrestError;

  if (postgrestError.code === '42501' || postgrestError.code === 'PGRST301') {
    return ERROR_MESSAGES.AUTH;
  }

  if (postgrestError.code === 'PGRST116') {
    return ERROR_MESSAGES.NOT_FOUND;
  }

  if (postgrestError.code === '23505') {
    return 'This record already exists.';
  }

  if (postgrestError.code === '23503') {
    return 'Cannot delete this record because it is referenced by other data.';
  }

  if (postgrestError.code?.startsWith('23')) {
    return ERROR_MESSAGES.VALIDATION;
  }

  if (postgrestError.message) {
    return postgrestError.message;
  }

  return ERROR_MESSAGES.GENERIC;
}

export function getErrorTitle(error: PostgrestError | null | unknown): string {
  if (!error) return 'Error';

  const postgrestError = error as PostgrestError;

  if (postgrestError.code === '42501' || postgrestError.code === 'PGRST301') {
    return 'Authentication Error';
  }

  if (postgrestError.code === 'PGRST116') {
    return 'Not Found';
  }

  if (postgrestError.code?.startsWith('23')) {
    return 'Validation Error';
  }

  if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('Network'))) {
    return 'Network Error';
  }

  return 'Error';
}
