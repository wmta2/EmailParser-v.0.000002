import { supabase, type Customer } from './supabase';

export type MatchMethod = 'account_number' | 'supplier_code' | 'postcode' | 'manual';

export interface CustomerMatchResult {
  bestMatch: Customer | null;
  candidates: Customer[];
  matchMethod: MatchMethod | null;
}

function normalisePostcode(pc: string | null | undefined): string {
  return (pc || '').replace(/\s+/g, '').toUpperCase();
}

function nameWordsMatch(
  parsedName: string | null | undefined,
  customerName: string | null | undefined
): boolean {
  if (!parsedName || !customerName) return false;
  const parsedWords = parsedName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const custLower = customerName.toLowerCase();
  return parsedWords.some(word => custLower.includes(word));
}

export async function findCustomerMatch(
  supplierCode?: string | null,
  deliveryPostcode?: string | null,
  billingPostcode?: string | null,
  requester?: string | null,
  deliveryName?: string | null,
  accountNumber?: string | null
): Promise<CustomerMatchResult> {
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });

  const customers: Customer[] = allCustomers ?? [];

  if (accountNumber) {
    const match = customers.find(
      c => c.account_number && c.account_number.toLowerCase() === accountNumber.toLowerCase()
    );
    if (match) {
      return {
        bestMatch: match,
        candidates: [match],
        matchMethod: 'account_number',
      };
    }
  }

  if (supplierCode) {
    const match = customers.find(
      c => c.supplier_code && c.supplier_code.toLowerCase() === supplierCode.toLowerCase()
    );
    if (match) {
      return {
        bestMatch: match,
        candidates: [match],
        matchMethod: 'supplier_code',
      };
    }
  }

  const targetPostcodes = [deliveryPostcode, billingPostcode]
    .map(normalisePostcode)
    .filter(Boolean);

  if (targetPostcodes.length > 0) {
    const postcodeMatches = customers.filter(c => {
      const custPostcodes = [c.shipping_postcode, c.billing_postcode].map(normalisePostcode);
      return targetPostcodes.some(tp => custPostcodes.includes(tp));
    });

    if (postcodeMatches.length > 0) {
      const nameHints = [requester, deliveryName].filter(Boolean);
      if (nameHints.length > 0) {
        const nameFiltered = postcodeMatches.filter(c =>
          nameHints.some(hint => nameWordsMatch(hint, c.name))
        );
        if (nameFiltered.length > 0) {
          return {
            bestMatch: nameFiltered.length === 1 ? nameFiltered[0] : null,
            candidates: nameFiltered,
            matchMethod: 'postcode',
          };
        }
      }

      return {
        bestMatch: postcodeMatches.length === 1 ? postcodeMatches[0] : null,
        candidates: postcodeMatches,
        matchMethod: 'postcode',
      };
    }
  }

  return {
    bestMatch: null,
    candidates: [],
    matchMethod: null,
  };
}
