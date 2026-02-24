import { supabase, type Customer, type Order } from './supabase';

export type MatchMethod = 'account_number' | 'supplier_code' | 'postcode' | 'manual';

export interface CustomerMatchResult {
  bestMatch: Customer | null;
  candidates: Customer[];
  matchMethod: MatchMethod | null;
}

export interface CustomerMatchCriteria {
  accountNumber?: string | null;
  supplierCode?: string | null;
  deliveryPostcode?: string | null;
  billingPostcode?: string | null;
  requester?: string | null;
  deliveryName?: string | null;
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
  criteria: CustomerMatchCriteria
): Promise<CustomerMatchResult> {
  if (criteria.accountNumber) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .ilike('account_number', criteria.accountNumber)
      .maybeSingle();

    if (data) {
      return {
        bestMatch: data,
        candidates: [data],
        matchMethod: 'account_number',
      };
    }
  }

  if (criteria.supplierCode) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .ilike('supplier_code', criteria.supplierCode)
      .maybeSingle();

    if (data) {
      return {
        bestMatch: data,
        candidates: [data],
        matchMethod: 'supplier_code',
      };
    }
  }

  const targetPostcodes = [criteria.deliveryPostcode, criteria.billingPostcode]
    .map(normalisePostcode)
    .filter(Boolean);

  if (targetPostcodes.length > 0) {
    const orConditions = targetPostcodes.flatMap(pc => [
      `shipping_postcode.ilike.${pc}`,
      `billing_postcode.ilike.${pc}`
    ]).join(',');

    const { data: postcodeMatches } = await supabase
      .from('customers')
      .select('*')
      .or(orConditions)
      .order('name', { ascending: true });

    const customers = postcodeMatches ?? [];

    if (customers.length > 0) {
      const nameHints = [criteria.requester, criteria.deliveryName].filter(Boolean);
      if (nameHints.length > 0) {
        const nameFiltered = customers.filter(c =>
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
        bestMatch: customers.length === 1 ? customers[0] : null,
        candidates: customers,
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

export function extractMatchCriteriaFromOrder(order: Order): CustomerMatchCriteria {
  return {
    accountNumber: order.account_number,
    supplierCode: order.supplier_code,
    deliveryPostcode: order.delivery_postcode,
    billingPostcode: order.billing_postcode,
    requester: order.requester,
    deliveryName: order.delivery_name,
  };
}
