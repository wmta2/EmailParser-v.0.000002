import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { OrderwiseAdapter } from '../lib/erp/orderwiseAdapter';
import {
  upsertCustomer,
  syncAddressesForCustomer,
  buildCustomerSnapshot,
  type CustomerSyncStats,
  type AddressSyncStats
} from '../lib/services/customerSyncService';
import {
  createSyncLog,
  updateSyncLogStatus,
  recordSyncItem,
  fetchSyncLogs,
  fetchSyncItems,
  type CustomerSyncLog,
  type CustomerSyncItem
} from '../lib/services/syncLoggingService';

export type { CustomerSyncStats, AddressSyncStats, CustomerSyncLog, CustomerSyncItem };

export function useOrderwiseCustomerSync() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [stats, setStats] = useState<CustomerSyncStats>({
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
  });

  async function syncCustomers(
    erpDestinationId: string,
    isManual: boolean = true
  ): Promise<{ success: boolean; stats: CustomerSyncStats; addressStats?: AddressSyncStats; error?: string }> {
    setSyncing(true);
    setProgress('Initializing customer sync...');
    setStats({ fetched: 0, created: 0, updated: 0, skipped: 0 });

    let syncLogId: string | null = null;

    try {
      const { data: erpConfig, error: configError } = await supabase
        .from('erp_configurations')
        .select('*, erp_destinations!inner(*)')
        .eq('erp_destination_id', erpDestinationId)
        .maybeSingle();

      if (configError || !erpConfig) {
        throw new Error('ERP configuration not found');
      }

      const adapter = new OrderwiseAdapter();

      const { data: lastAmendedRow } = await supabase
        .from('customers')
        .select('last_amended_at')
        .not('last_amended_at', 'is', null)
        .order('last_amended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastModifiedSince = lastAmendedRow?.last_amended_at ?? null;

      syncLogId = await createSyncLog(erpDestinationId, isManual ? 'manual' : 'scheduled', lastModifiedSince);

      if (!syncLogId) {
        throw new Error('Failed to create sync log');
      }

      setProgress(
        lastModifiedSince
          ? `Fetching customers amended after ${new Date(lastModifiedSince).toLocaleString()}...`
          : 'Fetching all customers from Orderwise...'
      );

      const fetchResult = await adapter.fetchCustomers(
        erpConfig.credentials,
        erpDestinationId,
        erpConfig.id,
        lastModifiedSince ?? undefined
      );

      if (!fetchResult.success) {
        throw new Error(fetchResult.errorMessage || 'Failed to fetch customers');
      }

      const customers = fetchResult.customers;
      setStats(prev => ({ ...prev, fetched: customers.length }));
      setProgress(`Processing ${customers.length} customers...`);

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const addrTotals: AddressSyncStats = { fetched: 0, created: 0, updated: 0, skipped: 0 };

      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        setProgress(`Processing customer ${i + 1} of ${customers.length}...`);
        const snapshot = buildCustomerSnapshot(customer);

        const result = await upsertCustomer(customer, lastModifiedSince);

        if (result.action === 'created') {
          created++;
        } else if (result.action === 'updated') {
          updated++;
        } else {
          skipped++;
        }

        await recordSyncItem(
          syncLogId,
          result.customerId,
          customer.accountNumber || 'unknown',
          result.action,
          snapshot,
          result.error
        );

        if (result.customerId && customer.id != null) {
          setProgress(`Fetching delivery addresses for customer ${i + 1} of ${customers.length}...`);
          const addrResult = await syncAddressesForCustomer(
            adapter,
            erpConfig.credentials,
            result.customerId,
            customer.id,
            erpDestinationId,
            erpConfig.id
          );
          addrTotals.fetched += addrResult.fetched;
          addrTotals.created += addrResult.created;
          addrTotals.updated += addrResult.updated;
          addrTotals.skipped += addrResult.skipped;
        }

        setStats({ fetched: customers.length, created, updated, skipped });
      }

      await updateSyncLogStatus(syncLogId, 'completed', {
        customersFetched: customers.length,
        customersCreated: created,
        customersUpdated: updated,
        customersSkipped: skipped,
        addressesFetched: addrTotals.fetched,
        addressesCreated: addrTotals.created,
        addressesUpdated: addrTotals.updated,
        addressesSkipped: addrTotals.skipped,
      });

      setProgress('Customer sync completed successfully!');

      return {
        success: true,
        stats: { fetched: customers.length, created, updated, skipped },
        addressStats: addrTotals,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

      if (syncLogId) {
        await updateSyncLogStatus(syncLogId, 'failed', undefined, {
          message: errorMessage,
          details: { error: String(err) }
        });
      }

      setProgress(`Error: ${errorMessage}`);

      return {
        success: false,
        stats,
        error: errorMessage,
      };
    } finally {
      setSyncing(false);
    }
  }

  return {
    syncing,
    progress,
    stats,
    syncCustomers,
    fetchSyncLogs: (erpDestinationId: string, limit?: number) => fetchSyncLogs(erpDestinationId, limit),
    fetchSyncItems: (syncLogId: string, actionFilter?: 'created' | 'updated' | 'skipped') => fetchSyncItems(syncLogId, actionFilter),
  };
}
