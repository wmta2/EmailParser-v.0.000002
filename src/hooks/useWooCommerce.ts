import { useState, useCallback } from 'react';
import { supabase, type SalesChannel, type ChannelConfiguration } from '../lib/supabase';
import { getAdapter } from '../lib/channels/channelRegistry';
import type { ConnectionTestResult, TransformedOrder, TransformedCustomer } from '../lib/channels/types';

export interface SyncProgress {
  phase: 'fetching' | 'importing' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface SyncResult {
  success: boolean;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export function useWooCommerceSync(channel: SalesChannel | null, config: ChannelConfiguration | null) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const testConnection = useCallback(async (): Promise<ConnectionTestResult> => {
    if (!config) return { success: false, message: 'No configuration found' };
    const adapter = getAdapter('woocommerce');
    if (!adapter) return { success: false, message: 'WooCommerce adapter not found' };
    return adapter.testConnection(config.config_data, config.credentials);
  }, [config]);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!channel || !config) {
      const r = { success: false, imported: 0, skipped: 0, failed: 0, errors: ['Missing channel or configuration'] };
      setLastResult(r);
      return r;
    }

    const adapter = getAdapter('woocommerce');
    if (!adapter) {
      const r = { success: false, imported: 0, skipped: 0, failed: 0, errors: ['Adapter not found'] };
      setLastResult(r);
      return r;
    }

    setSyncing(true);
    setProgress({ phase: 'fetching', current: 0, total: 0, message: 'Fetching orders from WooCommerce...' });

    const { data: logEntry } = await supabase
      .from('channel_sync_log')
      .insert({
        channel_id: channel.id,
        sync_type: 'manual',
        status: 'started',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const syncLogId = logEntry?.id;
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    try {
      await supabase
        .from('channel_configurations')
        .update({ sync_status: 'syncing' })
        .eq('id', config.id);

      const since = config.last_sync_at || undefined;
      const rawOrders = await adapter.fetchOrders(config.config_data, config.credentials, since);

      setProgress({ phase: 'importing', current: 0, total: rawOrders.length, message: `Importing 0 of ${rawOrders.length} orders...` });

      for (let i = 0; i < rawOrders.length; i++) {
        const raw = rawOrders[i];

        try {
          const { data: existingImport } = await supabase
            .from('channel_raw_imports')
            .select('id, order_id')
            .eq('channel_id', channel.id)
            .eq('external_id', raw.externalId)
            .maybeSingle();

          if (existingImport?.order_id) {
            skipped++;
            setProgress({
              phase: 'importing',
              current: i + 1,
              total: rawOrders.length,
              message: `Skipped order ${raw.externalId} (already imported). ${i + 1} of ${rawOrders.length}...`,
            });
            continue;
          }

          let transformed: TransformedOrder;
          try {
            transformed = adapter.transformOrder(raw);
          } catch (transformErr) {
            const errMsg = transformErr instanceof Error ? transformErr.message : 'Transform failed';

            await supabase.from('channel_raw_imports').upsert({
              channel_id: channel.id,
              sync_log_id: syncLogId,
              external_id: raw.externalId,
              raw_data: raw.rawJson,
              import_status: 'failed',
              error_message: errMsg,
            }, { onConflict: 'channel_id,external_id' });

            errors.push(`Order ${raw.externalId}: ${errMsg}`);
            failed++;
            continue;
          }

          let channelCustomerId: string | null = null;
          if (transformed.customerData) {
            channelCustomerId = await upsertChannelCustomer(channel.id, transformed.customerData);
          }

          const { data: orderData, error: orderErr } = await supabase
            .from('orders')
            .insert({
              ...transformed.order,
              channel_id: channel.id,
              channel_customer_id: channelCustomerId,
              raw_email_id: null,
            })
            .select('id')
            .single();

          if (orderErr) throw orderErr;

          if (transformed.items.length > 0) {
            const itemsToInsert = transformed.items.map(item => ({
              ...item,
              order_id: orderData.id,
            }));

            const { error: itemsErr } = await supabase
              .from('order_items')
              .insert(itemsToInsert);

            if (itemsErr) {
              errors.push(`Order ${raw.externalId} items: ${itemsErr.message}`);
            }
          }

          await supabase.from('channel_raw_imports').upsert({
            channel_id: channel.id,
            sync_log_id: syncLogId,
            external_id: raw.externalId,
            raw_data: raw.rawJson,
            import_status: 'success',
            order_id: orderData.id,
          }, { onConflict: 'channel_id,external_id' });

          imported++;
          setProgress({
            phase: 'importing',
            current: i + 1,
            total: rawOrders.length,
            message: `Imported order ${raw.externalId}. ${i + 1} of ${rawOrders.length}...`,
          });
        } catch (orderErr) {
          const errMsg = orderErr instanceof Error ? orderErr.message : 'Import failed';

          await supabase.from('channel_raw_imports').upsert({
            channel_id: channel.id,
            sync_log_id: syncLogId,
            external_id: raw.externalId,
            raw_data: raw.rawJson,
            import_status: 'failed',
            error_message: errMsg,
          }, { onConflict: 'channel_id,external_id' });

          errors.push(`Order ${raw.externalId}: ${errMsg}`);
          failed++;
        }
      }

      const finalStatus = failed > 0 && imported > 0 ? 'partial' : failed > 0 ? 'failed' : 'success';

      if (syncLogId) {
        await supabase
          .from('channel_sync_log')
          .update({
            status: finalStatus,
            orders_imported: imported,
            orders_skipped: skipped,
            orders_failed: failed,
            error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
            error_details: errors.length > 0 ? { errors } : null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLogId);
      }

      await supabase
        .from('channel_configurations')
        .update({
          sync_status: 'idle',
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      const result: SyncResult = { success: failed === 0, imported, skipped, failed, errors };
      setLastResult(result);
      setProgress({ phase: 'done', current: rawOrders.length, total: rawOrders.length, message: 'Sync complete.' });
      setSyncing(false);
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Sync failed';

      if (syncLogId) {
        await supabase
          .from('channel_sync_log')
          .update({
            status: 'failed',
            orders_imported: imported,
            orders_skipped: skipped,
            orders_failed: failed,
            error_message: errMsg,
            error_details: { errors: [...errors, errMsg] },
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLogId);
      }

      await supabase
        .from('channel_configurations')
        .update({ sync_status: 'error' })
        .eq('id', config.id);

      const result: SyncResult = { success: false, imported, skipped, failed, errors: [...errors, errMsg] };
      setLastResult(result);
      setProgress(null);
      setSyncing(false);
      return result;
    }
  }, [channel, config]);

  return { syncing, progress, lastResult, testConnection, syncNow };
}

async function upsertChannelCustomer(channelId: string, data: TransformedCustomer): Promise<string | null> {
  const { data: existing } = await supabase
    .from('channel_customers')
    .select('id')
    .eq('channel_id', channelId)
    .eq('external_id', data.externalId)
    .maybeSingle();

  const fields = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    billing_name: data.billing_name ?? null,
    billing_address1: data.billing_address1 ?? null,
    billing_address2: data.billing_address2 ?? null,
    billing_address3: data.billing_address3 ?? null,
    billing_town: data.billing_town ?? null,
    billing_county: data.billing_county ?? null,
    billing_postcode: data.billing_postcode ?? null,
    billing_country: data.billing_country ?? null,
    billing_country_code: data.billing_country_code ?? null,
    billing_email: data.billing_email ?? null,
    billing_telephone: data.billing_telephone ?? null,
    shipping_name: data.shipping_name ?? null,
    shipping_address1: data.shipping_address1 ?? null,
    shipping_address2: data.shipping_address2 ?? null,
    shipping_address3: data.shipping_address3 ?? null,
    shipping_town: data.shipping_town ?? null,
    shipping_county: data.shipping_county ?? null,
    shipping_postcode: data.shipping_postcode ?? null,
    shipping_country: data.shipping_country ?? null,
    shipping_country_code: data.shipping_country_code ?? null,
    shipping_email: data.shipping_email ?? null,
    shipping_telephone: data.shipping_telephone ?? null,
    metadata: data.metadata,
  };

  if (existing) {
    await supabase
      .from('channel_customers')
      .update(fields)
      .eq('id', existing.id);

    return existing.id;
  }

  const { data: newCust } = await supabase
    .from('channel_customers')
    .insert({
      channel_id: channelId,
      external_id: data.externalId,
      ...fields,
    })
    .select('id')
    .single();

  return newCust?.id ?? null;
}
