import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  type Customer,
  type CustomerSourceMapping,
  type Order,
  type SalesChannel,
} from '../lib/supabase';

export interface ChannelOption {
  id: string;
  name: string;
  icon_name: string;
  source_type: 'sales_channel' | 'erp_destination';
}

export interface CustomerWithStats extends Customer {
  order_count: number;
  last_order_date: string | null;
  channel_name?: string;
  channel_icon?: string;
  channel_source_type?: 'sales_channel' | 'erp_destination';
}

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [custResult, ordersResult, salesChannelsResult, erpResult] = await Promise.all([
        supabase.from('customers').select('*').order('name', { ascending: true }),
        supabase.from('orders').select('id, customer_id, created_at'),
        supabase.from('sales_channels').select('*'),
        supabase.from('erp_destinations').select('id, name, icon_name'),
      ]);

      if (custResult.error) throw custResult.error;

      const channelMap = new Map<string, { name: string; icon_name: string; source_type: 'sales_channel' | 'erp_destination' }>();
      for (const c of salesChannelsResult.data ?? []) {
        channelMap.set(c.id, { name: c.name, icon_name: c.icon_name, source_type: 'sales_channel' });
      }
      for (const e of erpResult.data ?? []) {
        channelMap.set(e.id, { name: e.name, icon_name: e.icon_name, source_type: 'erp_destination' });
      }

      const ordersByCustomer = new Map<string, { count: number; lastDate: string | null }>();
      for (const o of ordersResult.data ?? []) {
        if (!o.customer_id) continue;
        const existing = ordersByCustomer.get(o.customer_id);
        if (!existing) {
          ordersByCustomer.set(o.customer_id, { count: 1, lastDate: o.created_at });
        } else {
          existing.count++;
          if (!existing.lastDate || o.created_at > existing.lastDate) {
            existing.lastDate = o.created_at;
          }
        }
      }

      const enriched: CustomerWithStats[] = (custResult.data ?? []).map(c => {
        const ch = channelMap.get(c.source_channel_id);
        const stats = ordersByCustomer.get(c.id);
        return {
          ...c,
          order_count: stats?.count ?? 0,
          last_order_date: stats?.lastDate ?? null,
          channel_name: ch?.name,
          channel_icon: ch?.icon_name,
          channel_source_type: ch?.source_type,
        };
      });

      const salesChannelOptions: ChannelOption[] = (salesChannelsResult.data ?? []).map(c => ({
        id: c.id,
        name: c.name,
        icon_name: c.icon_name,
        source_type: 'sales_channel',
      }));
      const erpChannelOptions: ChannelOption[] = (erpResult.data ?? []).map(e => ({
        id: e.id,
        name: e.name,
        icon_name: e.icon_name,
        source_type: 'erp_destination',
      }));

      setCustomers(enriched);
      setChannels([...salesChannelOptions, ...erpChannelOptions]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter(c => {
    if (channelFilter !== 'all' && c.source_channel_id !== channelFilter) return false;
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

export function useCustomerDetail(customerId: string | null) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [mappings, setMappings] = useState<CustomerSourceMapping[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!customerId) {
      setCustomer(null);
      setMappings([]);
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [custResult, mapResult, ordersResult] = await Promise.all([
        supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
        supabase.from('customer_source_mappings').select('*').eq('customer_id', customerId),
        supabase.from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      ]);

      setCustomer(custResult.data);
      setMappings(mapResult.data ?? []);
      setOrders(ordersResult.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { customer, mappings, orders, loading, refresh: fetch };
}
