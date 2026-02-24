import { supabase } from '../supabase';
import type { OrderwiseCustomer } from '../erp/types';
import { buildCustomerSnapshot } from './customerSyncService';

export interface CustomerSyncLog {
  id: string;
  erp_destination_id: string;
  sync_type: 'manual' | 'scheduled';
  status: 'running' | 'completed' | 'failed';
  customers_fetched: number;
  customers_created: number;
  customers_updated: number;
  customers_skipped: number;
  addresses_fetched: number;
  addresses_created: number;
  addresses_updated: number;
  addresses_skipped: number;
  error_message?: string;
  error_details?: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  last_modified_since?: string;
  created_at: string;
}

export interface CustomerSyncItem {
  id: string;
  sync_log_id: string;
  customer_id: string | null;
  external_id: string;
  action: 'created' | 'updated' | 'skipped';
  customer_snapshot: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

export async function createSyncLog(
  erpDestinationId: string,
  syncType: 'manual' | 'scheduled',
  lastModifiedSince: string | null
): Promise<string | null> {
  const { data: syncLog, error } = await supabase
    .from('customer_sync_log')
    .insert({
      erp_destination_id: erpDestinationId,
      sync_type: syncType,
      status: 'running',
      started_at: new Date().toISOString(),
      last_modified_since: lastModifiedSince,
    })
    .select()
    .single();

  if (error || !syncLog) {
    console.error('Failed to create sync log:', error);
    return null;
  }

  return syncLog.id;
}

export async function updateSyncLogStatus(
  syncLogId: string,
  status: 'running' | 'completed' | 'failed',
  stats?: {
    customersFetched?: number;
    customersCreated?: number;
    customersUpdated?: number;
    customersSkipped?: number;
    addressesFetched?: number;
    addressesCreated?: number;
    addressesUpdated?: number;
    addressesSkipped?: number;
  },
  error?: { message: string; details?: Record<string, unknown> }
) {
  const updateData: any = {
    status,
    completed_at: new Date().toISOString(),
  };

  if (stats) {
    if (stats.customersFetched !== undefined) updateData.customers_fetched = stats.customersFetched;
    if (stats.customersCreated !== undefined) updateData.customers_created = stats.customersCreated;
    if (stats.customersUpdated !== undefined) updateData.customers_updated = stats.customersUpdated;
    if (stats.customersSkipped !== undefined) updateData.customers_skipped = stats.customersSkipped;
    if (stats.addressesFetched !== undefined) updateData.addresses_fetched = stats.addressesFetched;
    if (stats.addressesCreated !== undefined) updateData.addresses_created = stats.addressesCreated;
    if (stats.addressesUpdated !== undefined) updateData.addresses_updated = stats.addressesUpdated;
    if (stats.addressesSkipped !== undefined) updateData.addresses_skipped = stats.addressesSkipped;
  }

  if (error) {
    updateData.error_message = error.message;
    updateData.error_details = error.details;
  }

  await supabase
    .from('customer_sync_log')
    .update(updateData)
    .eq('id', syncLogId);
}

export async function recordSyncItem(
  syncLogId: string,
  customerId: string | null,
  externalId: string,
  action: 'created' | 'updated' | 'skipped',
  customerSnapshot: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  await supabase.from('customer_sync_items').insert({
    sync_log_id: syncLogId,
    customer_id: customerId,
    external_id: externalId,
    action,
    customer_snapshot: customerSnapshot,
    error_message: errorMessage ?? null,
  });
}

export async function fetchSyncLogs(
  erpDestinationId: string,
  limit: number = 10
): Promise<CustomerSyncLog[]> {
  const { data, error } = await supabase
    .from('customer_sync_log')
    .select('*')
    .eq('erp_destination_id', erpDestinationId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as CustomerSyncLog[];
}

export async function fetchSyncItems(
  syncLogId: string,
  actionFilter?: 'created' | 'updated' | 'skipped'
): Promise<CustomerSyncItem[]> {
  let query = supabase
    .from('customer_sync_items')
    .select('*')
    .eq('sync_log_id', syncLogId)
    .order('created_at', { ascending: true });

  if (actionFilter) {
    query = query.eq('action', actionFilter);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data as CustomerSyncItem[];
}
