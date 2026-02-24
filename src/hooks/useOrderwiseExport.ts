import { useState, useCallback } from 'react';
import { supabase, type OrderExport } from '../lib/supabase';
import { getErpAdapter } from '../lib/erp/erpRegistry';
import { parseFailedVariantCodes, isItemFailed } from '../lib/errorParser';
import type { OrderExportPayload, ValueListItem } from '../lib/erp/types';
import type { OrderwiseAdapter } from '../lib/erp/orderwiseAdapter';

export interface ExportProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  current: string;
}

export function useOrderwiseExport(
  destinationId: string | null,
  configurationId: string | null,
  config: Record<string, any>,
  credentials: Record<string, any>
) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [valueLists, setValueLists] = useState<Record<number, ValueListItem[]>>({});
  const [loadingValueList, setLoadingValueList] = useState(false);

  const adapter = getErpAdapter('orderwise');

  const testConnection = useCallback(async (overrideCredentials?: Record<string, any>) => {
    if (!adapter) return;
    setTesting(true);
    setTestResult(null);
    try {
      const credsToUse = overrideCredentials || credentials;
      const result = await adapter.testConnection(
        config,
        credsToUse,
        destinationId || undefined,
        configurationId || undefined
      );
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  }, [adapter, config, credentials, destinationId, configurationId]);

  const fetchValueList = useCallback(async (listId: number) => {
    if (!adapter || !adapter.fetchValueList) return;
    setLoadingValueList(true);
    try {
      const items = await (adapter as OrderwiseAdapter).fetchValueList(
        credentials,
        listId,
        destinationId || undefined,
        configurationId || undefined
      );
      setValueLists(prev => ({ ...prev, [listId]: items }));
    } catch {
      // silently fail - value list dropdowns will show as empty
    } finally {
      setLoadingValueList(false);
    }
  }, [adapter, credentials, destinationId, configurationId]);

  const exportSingleOrder = useCallback(async (payload: OrderExportPayload): Promise<OrderExport | null> => {
    if (!adapter || !destinationId) return null;

    setExporting(true);
    try {
      const { data: exportRecord, error: insertErr } = await supabase
        .from('order_exports')
        .insert({
          order_id: payload.order.id,
          erp_destination_id: destinationId,
          export_status: 'processing',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      const result = await adapter.exportOrder(config, credentials, payload);

      const updateData = {
        export_status: result.success ? 'success' : 'failed',
        external_order_id: result.externalOrderId || null,
        external_order_number: result.externalOrderNumber || null,
        error_message: result.errorMessage || null,
        request_payload: result.requestPayload,
        response_payload: result.responsePayload,
        ...(result.success ? { exported_at: new Date().toISOString() } : {}),
      };

      const { data: updated } = await supabase
        .from('order_exports')
        .update(updateData)
        .eq('id', exportRecord.id)
        .select()
        .single();

      await supabase
        .from('orders')
        .update({ ow_export_status: result.success ? 'exported' : 'export_failed' })
        .eq('id', payload.order.id);

      if (!result.success && result.responsePayload) {
        const failedVariants = parseFailedVariantCodes(result.responsePayload);
        if (failedVariants.length > 0 && payload.items) {
          const failedItemIds = payload.items
            .filter(item => isItemFailed(item.sku || item.product_code, failedVariants))
            .map(item => item.id);

          if (failedItemIds.length > 0) {
            await supabase
              .from('order_items')
              .update({ export_to_erp: false })
              .in('id', failedItemIds);
          }
        }
      }

      return updated;
    } catch (err) {
      throw err;
    } finally {
      setExporting(false);
    }
  }, [adapter, destinationId, config, credentials]);

  const exportBatchOrders = useCallback(async (payloads: OrderExportPayload[]): Promise<void> => {
    if (!adapter || !destinationId) return;

    setExporting(true);
    setProgress({ total: payloads.length, completed: 0, succeeded: 0, failed: 0, current: '' });

    const { data: syncLog, error: logErr } = await supabase
      .from('erp_sync_log')
      .insert({
        erp_destination_id: destinationId,
        sync_type: 'manual_batch',
        status: 'in_progress',
      })
      .select()
      .single();

    if (logErr) {
      setExporting(false);
      setProgress(null);
      throw logErr;
    }

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ orderNumber: string; error: string }> = [];

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      setProgress(prev => prev ? {
        ...prev,
        completed: i,
        current: payload.order.order_number || `Order ${i + 1}`,
      } : null);

      const { data: existing } = await supabase
        .from('order_exports')
        .select('id')
        .eq('order_id', payload.order.id)
        .eq('erp_destination_id', destinationId)
        .eq('export_status', 'success')
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      try {
        const result = await exportSingleOrder(payload);
        if (result?.export_status === 'success') {
          succeeded++;
        } else {
          failed++;
          errors.push({
            orderNumber: payload.order.order_number,
            error: result?.error_message || 'Unknown error',
          });
        }
      } catch (err) {
        failed++;
        errors.push({
          orderNumber: payload.order.order_number,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await supabase
      .from('erp_sync_log')
      .update({
        status: failed > 0 ? (succeeded > 0 ? 'partial' : 'failed') : 'completed',
        orders_exported: succeeded,
        orders_skipped: skipped,
        orders_failed: failed,
        error_message: errors.length > 0 ? `${errors.length} order(s) failed to export` : null,
        error_details: errors.length > 0 ? { errors } : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLog.id);

    await supabase
      .from('erp_configurations')
      .update({
        sync_status: 'idle',
        last_sync_at: new Date().toISOString(),
      })
      .eq('erp_destination_id', destinationId);

    setProgress(prev => prev ? {
      ...prev,
      completed: payloads.length,
      succeeded,
      failed,
      current: 'Done',
    } : null);
    setExporting(false);
  }, [adapter, destinationId, exportSingleOrder]);

  const getOrderExportHistory = useCallback(async (orderId: string): Promise<OrderExport[]> => {
    const { data } = await supabase
      .from('order_exports')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    return data ?? [];
  }, []);

  const getOrderExportStatus = useCallback(async (orderId: string): Promise<OrderExport | null> => {
    const { data } = await supabase
      .from('order_exports')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  }, []);

  return {
    exporting,
    progress,
    testResult,
    testing,
    valueLists,
    loadingValueList,
    testConnection,
    fetchValueList,
    exportSingleOrder,
    exportBatchOrders,
    getOrderExportHistory,
    getOrderExportStatus,
  };
}
