import { supabase, type SalesChannel } from '../supabase';
import type { ChannelAdapter } from './types';
import { WooCommerceAdapter } from './woocommerceChannel';

const adapters: Record<string, ChannelAdapter> = {
  woocommerce: new WooCommerceAdapter(),
};

export function getAdapter(slug: string): ChannelAdapter | null {
  return adapters[slug] ?? null;
}

export async function getActiveChannels(): Promise<SalesChannel[]> {
  const { data, error } = await supabase
    .from('sales_channels')
    .select('*')
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error loading channels:', error);
    return [];
  }

  return data ?? [];
}

export async function getEnabledChannels(): Promise<SalesChannel[]> {
  const channels = await getActiveChannels();
  return channels.filter(c => c.enabled);
}

export async function getChannelBySlug(slug: string): Promise<SalesChannel | null> {
  const { data, error } = await supabase
    .from('sales_channels')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error loading channel:', error);
    return null;
  }

  return data;
}
