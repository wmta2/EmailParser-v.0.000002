import { supabase } from '../supabase';
import type { ProductSyncLog } from '../types/product';

export interface ProductSyncOptions {
  erpDestinationId: string;
}

export interface ProductSyncResult {
  success: boolean;
  syncLogId?: string;
  summary?: {
    products: {
      fetched: number;
      created: number;
      updated: number;
      skipped: number;
    };
    prices: {
      fetched: number;
      updated: number;
    };
  };
  error?: string;
}

export async function syncProducts(options: ProductSyncOptions): Promise<ProductSyncResult> {
  try {
    const { data: session } = await supabase.auth.getSession();

    if (!session?.session?.access_token) {
      throw new Error('Not authenticated');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/orderwise-product-sync`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        erpDestinationId: options.erpDestinationId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error('Product sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync products',
    };
  }
}

export async function getProductSyncLogs(
  erpDestinationId: string,
  limit: number = 10
): Promise<ProductSyncLog[]> {
  const { data, error } = await supabase
    .from('product_sync_log')
    .select('*')
    .eq('erp_destination_id', erpDestinationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch product sync logs:', error);
    return [];
  }

  return data || [];
}

export async function getProductSyncLog(syncLogId: string): Promise<ProductSyncLog | null> {
  const { data, error } = await supabase
    .from('product_sync_log')
    .select('*')
    .eq('id', syncLogId)
    .single();

  if (error) {
    console.error('Failed to fetch product sync log:', error);
    return null;
  }

  return data;
}

export async function getProductSyncItems(syncLogId: string) {
  const { data, error } = await supabase
    .from('product_sync_items')
    .select('*')
    .eq('sync_log_id', syncLogId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch product sync items:', error);
    return [];
  }

  return data || [];
}
