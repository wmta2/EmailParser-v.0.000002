import { useCallback } from 'react';
import { supabase, type Customer } from '../lib/supabase';
import { findCustomerMatch, type CustomerMatchCriteria } from '../lib/customerMatcher';

export type { MatchMethod, CustomerMatchResult, CustomerMatchCriteria } from '../lib/customerMatcher';

export function useCustomerMatch() {
  const findCustomerMatches = useCallback(
    async (criteria: CustomerMatchCriteria) => {
      return findCustomerMatch(criteria);
    },
    []
  );

  const searchCustomers = useCallback(async (query: string): Promise<Customer[]> => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${q}%,account_number.ilike.%${q}%,company.ilike.%${q}%,external_id.ilike.%${q}%`)
      .order('name', { ascending: true })
      .limit(20);

    return data ?? [];
  }, []);

  return { findCustomerMatches, searchCustomers };
}
