import { useState, useEffect } from 'react';
import { syncProducts, getProductSyncLogs, getProductSyncLog, getProductSyncItems } from '../lib/services/productSyncService';
import type { ProductSyncLog } from '../lib/types/product';

export function useProductSync(erpDestinationId: string) {
  const [syncLogs, setSyncLogs] = useState<ProductSyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (erpDestinationId) {
      fetchSyncLogs();
    }
  }, [erpDestinationId]);

  async function fetchSyncLogs() {
    try {
      setLoading(true);
      setError(null);
      const logs = await getProductSyncLogs(erpDestinationId);
      setSyncLogs(logs);
    } catch (err) {
      console.error('Error fetching sync logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sync logs');
    } finally {
      setLoading(false);
    }
  }

  async function triggerSync() {
    try {
      setSyncing(true);
      setError(null);

      const result = await syncProducts({ erpDestinationId });

      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }

      await fetchSyncLogs();

      return result;
    } catch (err) {
      console.error('Error syncing products:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync products';
      setError(errorMessage);
      throw err;
    } finally {
      setSyncing(false);
    }
  }

  return {
    syncLogs,
    loading,
    syncing,
    error,
    triggerSync,
    refetch: fetchSyncLogs,
  };
}

export function useProductSyncDetail(syncLogId: string | null) {
  const [syncLog, setSyncLog] = useState<ProductSyncLog | null>(null);
  const [syncItems, setSyncItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (syncLogId) {
      fetchSyncDetail();
    }
  }, [syncLogId]);

  async function fetchSyncDetail() {
    if (!syncLogId) return;

    try {
      setLoading(true);
      setError(null);

      const [log, items] = await Promise.all([
        getProductSyncLog(syncLogId),
        getProductSyncItems(syncLogId),
      ]);

      setSyncLog(log);
      setSyncItems(items);
    } catch (err) {
      console.error('Error fetching sync detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sync detail');
    } finally {
      setLoading(false);
    }
  }

  return {
    syncLog,
    syncItems,
    loading,
    error,
    refetch: fetchSyncDetail,
  };
}
