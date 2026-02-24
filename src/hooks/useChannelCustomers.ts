import { useState, useEffect, useCallback } from 'react';
import { supabase, type ChannelCustomer, type Order } from '../lib/supabase';

export interface ChannelCustomerWithStats extends ChannelCustomer {
  order_count: number;
  last_order_date: string | null;
  channel_name?: string;
  channel_icon?: string;
}

export function useChannelCustomers() {
  const [customers, setCustomers] = useState<ChannelCustomerWithStats[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string; icon_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [custResult, ordersResult, salesChannelsResult] = await Promise.all([
        supabase.from('channel_customers').select('*').order('name', { ascending: true }),
        supabase.from('orders').select('id, channel_customer_id, created_at'),
        supabase.from('sales_channels').select('id, name, icon_name'),
      ]);

      if (custResult.error) throw custResult.error;

      const channelMap = new Map<string, { name: string; icon_name: string }>();
      for (const c of salesChannelsResult.data ?? []) {
        channelMap.set(c.id, { name: c.name, icon_name: c.icon_name });
      }

      const ordersByCustomer = new Map<string, { count: number; lastDate: string | null }>();
      for (const o of ordersResult.data ?? []) {
        if (!o.channel_customer_id) continue;
        const existing = ordersByCustomer.get(o.channel_customer_id);
        if (!existing) {
          ordersByCustomer.set(o.channel_customer_id, { count: 1, lastDate: o.created_at });
        } else {
          existing.count++;
          if (!existing.lastDate || o.created_at > existing.lastDate) {
            existing.lastDate = o.created_at;
          }
        }
      }

      const enriched: ChannelCustomerWithStats[] = (custResult.data ?? []).map(c => {
        const ch = channelMap.get(c.channel_id);
        const stats = ordersByCustomer.get(c.id);
        return {
          ...c,
          order_count: stats?.count ?? 0,
          last_order_date: stats?.lastDate ?? null,
          channel_name: ch?.name,
          channel_icon: ch?.icon_name,
        };
      });

      setCustomers(enriched);
      setChannels(salesChannelsResult.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channel customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter(c => {
    if (channelFilter !== 'all' && c.channel_id !== channelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return {
    customers: filteredCustomers,
    allCustomers: customers,
    channels,
    loading,
    error,
    search,
    setSearch,
    channelFilter,
    setChannelFilter,
    fetchCustomers,
  };
}

export function useChannelCustomerDetail(customerId: string | null) {
  const [customer, setCustomer] = useState<ChannelCustomer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!customerId) {
      setCustomer(null);
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [custResult, ordersResult] = await Promise.all([
        supabase.from('channel_customers').select('*').eq('id', customerId).maybeSingle(),
        supabase.from('orders').select('*').eq('channel_customer_id', customerId).order('created_at', { ascending: false }),
      ]);

      setCustomer(custResult.data);
      setOrders(ordersResult.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { customer, orders, loading, refresh: fetch };
}
