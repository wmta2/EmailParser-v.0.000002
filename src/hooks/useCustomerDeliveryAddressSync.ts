import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { OrderwiseAdapter } from '../lib/erp/orderwiseAdapter';
import type { CustomerDeliveryAddress, DeliveryAddressSyncLog, DeliveryAddressSyncItem } from '../lib/supabase';

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  syncLogId?: string;
  error?: string;
}

export function useCustomerDeliveryAddressSync() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function syncDeliveryAddresses(
    customerId: string,
    orderwiseId: number
  ): Promise<SyncResult> {
    setSyncing(true);
    setError(null);

    let syncLogId: string | null = null;

    try {
      const { data: erpConfig, error: configError } = await supabase
        .from('erp_configurations')
        .select('*, erp_destinations!inner(*)')
        .maybeSingle();

      if (configError || !erpConfig) {
        throw new Error('ERP configuration not found');
      }

      const erpDestinationId: string = erpConfig.erp_destination_id;

      const { data: syncLog, error: logError } = await supabase
        .from('delivery_address_sync_log')
        .insert({
          customer_id: customerId,
          erp_destination_id: erpDestinationId,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (logError || !syncLog) {
        throw new Error('Failed to create sync log');
      }

      syncLogId = syncLog.id;
      const currentSyncLogId: string = syncLog.id;

      const adapter = new OrderwiseAdapter();
      const fetchResult = await adapter.fetchCustomerDeliveryAddresses(
        erpConfig.credentials,
        orderwiseId,
        erpDestinationId,
        erpConfig.id
      );

      if (!fetchResult.success) {
        const failedMetadata = fetchResult.apiMetadata;
        await supabase
          .from('delivery_address_sync_log')
          .update({
            status: 'failed',
            error_message: fetchResult.errorMessage || 'Failed to fetch delivery addresses',
            http_method: failedMetadata?.httpMethod || 'GET',
            endpoint: failedMetadata?.endpoint || null,
            request_headers: failedMetadata?.requestHeaders || null,
            response_body: failedMetadata?.responseBody || null,
            duration_ms: failedMetadata?.durationMs || null,
            error_details: {
              error: fetchResult.errorMessage,
              apiMetadata: failedMetadata,
            },
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLogId);
        return {
          success: false,
          created: 0,
          updated: 0,
          skipped: 0,
          syncLogId: currentSyncLogId,
          error: fetchResult.errorMessage || 'Failed to fetch delivery addresses',
        };
      }

      const addresses = fetchResult.addresses;
      const apiMetadata = fetchResult.apiMetadata;
      let created = 0;
      let updated = 0;
      let skipped = 0;

      const syncItems: Array<{
        sync_log_id: string;
        delivery_address_id?: string;
        external_id: string;
        action: 'created' | 'updated' | 'skipped';
        address_snapshot: Record<string, any>;
        error_message?: string;
      }> = [];

      for (const addr of addresses) {
        if (addr.id == null) {
          skipped++;
          syncItems.push({
            sync_log_id: currentSyncLogId,
            external_id: 'unknown',
            action: 'skipped',
            address_snapshot: addr.metadata || {},
            error_message: 'Missing address ID',
          });
          continue;
        }

        const externalId = String(addr.id);

        try {
          const { data: existing } = await supabase
            .from('customer_delivery_addresses')
            .select('id')
            .eq('customer_id', customerId)
            .eq('external_id', externalId)
            .maybeSingle();

          const fields = {
            name: addr.name ?? null,
            contact_name: addr.contactName ?? null,
            address1: addr.address1 ?? null,
            address2: addr.address2 ?? null,
            address3: addr.address3 ?? null,
            town: addr.town ?? null,
            county: addr.county ?? null,
            postcode: addr.postcode ?? null,
            country: addr.country ?? null,
            country_code: addr.countryCode ?? null,
            telephone: addr.telephone ?? null,
            email: addr.email ?? null,
            is_default: addr.isDefault ?? false,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const addressSnapshot = {
            external_id: externalId,
            ...fields,
          };

          if (existing) {
            const { error: updateError } = await supabase
              .from('customer_delivery_addresses')
              .update(fields)
              .eq('id', existing.id);

            if (updateError) {
              skipped++;
              syncItems.push({
                sync_log_id: currentSyncLogId,
                delivery_address_id: existing.id,
                external_id: externalId,
                action: 'skipped',
                address_snapshot: addressSnapshot,
                error_message: updateError.message,
              });
            } else {
              updated++;
              syncItems.push({
                sync_log_id: currentSyncLogId,
                delivery_address_id: existing.id,
                external_id: externalId,
                action: 'updated',
                address_snapshot: addressSnapshot,
              });
            }
          } else {
            const { data: insertedAddr, error: insertError } = await supabase
              .from('customer_delivery_addresses')
              .insert({
                customer_id: customerId,
                external_id: externalId,
                ...fields,
              })
              .select('id')
              .single();

            if (insertError) {
              skipped++;
              syncItems.push({
                sync_log_id: currentSyncLogId,
                external_id: externalId,
                action: 'skipped',
                address_snapshot: addressSnapshot,
                error_message: insertError.message,
              });
            } else {
              created++;
              syncItems.push({
                sync_log_id: currentSyncLogId,
                delivery_address_id: insertedAddr?.id,
                external_id: externalId,
                action: 'created',
                address_snapshot: addressSnapshot,
              });
            }
          }
        } catch (itemErr) {
          skipped++;
          syncItems.push({
            sync_log_id: currentSyncLogId,
            external_id: externalId,
            action: 'skipped',
            address_snapshot: addr.metadata || {},
            error_message: itemErr instanceof Error ? itemErr.message : 'Unknown error',
          });
        }
      }

      if (syncItems.length > 0) {
        await supabase.from('delivery_address_sync_items').insert(syncItems);
      }

      await supabase
        .from('delivery_address_sync_log')
        .update({
          status: 'completed',
          addresses_fetched: addresses.length,
          addresses_created: created,
          addresses_updated: updated,
          addresses_skipped: skipped,
          http_method: apiMetadata?.httpMethod || 'GET',
          endpoint: apiMetadata?.endpoint || null,
          request_headers: apiMetadata?.requestHeaders || null,
          response_body: apiMetadata?.responseBody || null,
          duration_ms: apiMetadata?.durationMs || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLogId);

      return { success: true, created, updated, skipped, syncLogId: currentSyncLogId };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      if (syncLogId) {
        await supabase
          .from('delivery_address_sync_log')
          .update({
            status: 'failed',
            error_message: errorMessage,
            error_details: { error: String(err) },
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLogId);
      }

      return { success: false, created: 0, updated: 0, skipped: 0, syncLogId: syncLogId ?? undefined, error: errorMessage };
    } finally {
      setSyncing(false);
    }
  }

  const fetchDeliveryAddresses = useCallback(async (customerId: string): Promise<CustomerDeliveryAddress[]> => {
    const { data, error: fetchError } = await supabase
      .from('customer_delivery_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (fetchError || !data) {
      return [];
    }

    return data as CustomerDeliveryAddress[];
  }, []);

  const fetchLastSyncLog = useCallback(async (customerId: string): Promise<DeliveryAddressSyncLog | null> => {
    const { data } = await supabase
      .from('delivery_address_sync_log')
      .select('*')
      .eq('customer_id', customerId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data as DeliveryAddressSyncLog | null;
  }, []);

  const fetchSyncLog = useCallback(async (syncLogId: string): Promise<DeliveryAddressSyncLog | null> => {
    const { data } = await supabase
      .from('delivery_address_sync_log')
      .select('*')
      .eq('id', syncLogId)
      .maybeSingle();

    return data as DeliveryAddressSyncLog | null;
  }, []);

  const fetchSyncItems = useCallback(async (
    syncLogId: string,
    actionFilter?: 'created' | 'updated' | 'skipped'
  ): Promise<DeliveryAddressSyncItem[]> => {
    let query = supabase
      .from('delivery_address_sync_items')
      .select('*')
      .eq('sync_log_id', syncLogId)
      .order('created_at', { ascending: true });

    if (actionFilter) {
      query = query.eq('action', actionFilter);
    }

    const { data, error: fetchErr } = await query;
    if (fetchErr || !data) return [];
    return data as DeliveryAddressSyncItem[];
  }, []);

  const fetchSyncHistory = useCallback(async (
    customerId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ logs: DeliveryAddressSyncLog[]; total: number }> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: fetchErr, count } = await supabase
      .from('delivery_address_sync_log')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('started_at', { ascending: false })
      .range(from, to);

    if (fetchErr || !data) return { logs: [], total: 0 };
    return { logs: data as DeliveryAddressSyncLog[], total: count || 0 };
  }, []);

  return {
    syncing,
    error,
    syncDeliveryAddresses,
    fetchDeliveryAddresses,
    fetchLastSyncLog,
    fetchSyncLog,
    fetchSyncItems,
    fetchSyncHistory,
  };
}
