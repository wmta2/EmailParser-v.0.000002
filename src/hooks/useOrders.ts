import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, type Order, type SalesChannel } from '../lib/supabase';

export interface OrderFilters {
  search: string;
  channelSource: string;
  orderStatus: string;
}

export interface OrderStats {
  total: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface EnrichedOrder extends Order {
  channel_name?: string;
  channel_icon?: string;
  customer_name?: string;
  customer_email?: string;
}

export function useOrders() {
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    channelSource: 'all',
    orderStatus: 'all',
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersResult, channelsResult, customersResult] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .neq('channel_source', 'email')
          .order('created_at', { ascending: false }),
        supabase
          .from('sales_channels')
          .select('*')
          .order('priority', { ascending: true }),
        supabase
          .from('customers')
          .select('id, name, email'),
      ]);

      if (ordersResult.error) throw ordersResult.error;

      const channelMap = new Map(
        (channelsResult.data ?? []).map(c => [c.id, c])
      );
      const customerMap = new Map(
        (customersResult.data ?? []).map(c => [c.id, c])
      );

      const enriched: EnrichedOrder[] = (ordersResult.data ?? []).map(o => {
        const ch = channelMap.get(o.channel_id);
        const cust = customerMap.get(o.customer_id);
        return {
          ...o,
          channel_name: ch?.name ?? o.channel_source,
          channel_icon: ch?.icon_name ?? 'Box',
          customer_name: cust?.name,
          customer_email: cust?.email,
        };
      });

      setOrders(enriched);
      setChannels(channelsResult.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => orders.filter(order => {
    if (filters.channelSource !== 'all' && order.channel_source !== filters.channelSource) {
      return false;
    }
    if (filters.orderStatus !== 'all' && order.order_status !== filters.orderStatus) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesSearch =
        order.order_number?.toLowerCase().includes(q) ||
        order.requester?.toLowerCase().includes(q) ||
        order.customer_name?.toLowerCase().includes(q) ||
        order.customer_email?.toLowerCase().includes(q) ||
        order.external_order_id?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    return true;
  }), [orders, filters]);

  const stats: OrderStats = useMemo(() => ({
    total: orders.length,
    byChannel: orders.reduce((acc, o) => {
      const key = o.channel_source || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byStatus: orders.reduce((acc, o) => {
      const key = o.order_status || 'pending';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  }), [orders]);

  return {
    orders: filteredOrders,
    allOrders: orders,
    channels,
    loading,
    error,
    filters,
    setFilters,
    stats,
    fetchOrders,
  };
}
