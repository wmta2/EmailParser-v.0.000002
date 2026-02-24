import { useState, useEffect } from 'react';
import { useChannels } from '../hooks/useChannels';
import { supabase, type ChannelConfiguration } from '../lib/supabase';
import {
  Mail,
  ShoppingCart,
  Package,
  Box,
  ToggleLeft,
  ToggleRight,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  Mail,
  ShoppingCart,
  Package,
  Box,
};

interface Props {
  onNavigateToChannel?: (slug: string) => void;
}

export function ChannelManagerPage({ onNavigateToChannel }: Props) {
  const { channels, loading, toggleChannel, fetchChannels } = useChannels();
  const [configs, setConfigs] = useState<Record<string, ChannelConfiguration>>({});
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    async function loadExtras() {
      const { data: configData } = await supabase
        .from('channel_configurations')
        .select('*');

      const configMap: Record<string, ChannelConfiguration> = {};
      for (const c of configData ?? []) {
        configMap[c.channel_id] = c;
      }
      setConfigs(configMap);

      const { data: orderData } = await supabase
        .from('orders')
        .select('channel_id');

      const counts: Record<string, number> = {};
      for (const o of orderData ?? []) {
        if (o.channel_id) {
          counts[o.channel_id] = (counts[o.channel_id] || 0) + 1;
        }
      }
      setOrderCounts(counts);
    }

    loadExtras();
  }, [channels]);

  async function handleToggle(id: string, currentEnabled: boolean) {
    setToggling(id);
    try {
      await toggleChannel(id, !currentEnabled);
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">Loading channels...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pl-16 lg:pl-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Sales Channels</h2>
          <p className="text-slate-600 mt-1">Manage order import sources</p>
        </div>
        <button
          onClick={fetchChannels}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {channels.map(channel => {
          const Icon = CHANNEL_ICONS[channel.icon_name] || Box;
          const config = configs[channel.id];
          const count = orderCounts[channel.id] || 0;
          const isToggling = toggling === channel.id;
          const syncStatus = config?.sync_status || 'idle';

          return (
            <div
              key={channel.id}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 ${
                channel.enabled ? 'border-blue-200' : 'border-slate-200'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      channel.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{channel.name}</h3>
                      <p className="text-sm text-slate-500">{channel.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(channel.id, channel.enabled)}
                    disabled={isToggling}
                    className="flex-shrink-0"
                  >
                    {channel.enabled
                      ? <ToggleRight className="w-10 h-10 text-blue-600" />
                      : <ToggleLeft className="w-10 h-10 text-slate-300" />
                    }
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    {channel.enabled
                      ? <Wifi className="w-4 h-4 text-green-500" />
                      : <WifiOff className="w-4 h-4 text-slate-400" />
                    }
                    <span className={channel.enabled ? 'text-green-600' : 'text-slate-500'}>
                      {channel.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Package className="w-4 h-4" />
                    <span>{count} orders</span>
                  </div>
                  {config?.last_sync_at && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span>Last sync: {new Date(config.last_sync_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {syncStatus !== 'idle' && (
                  <div className={`text-xs px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 mb-4 ${
                    syncStatus === 'syncing' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                    {syncStatus}
                  </div>
                )}

                {channel.slug !== 'email' && onNavigateToChannel && (
                  <button
                    onClick={() => onNavigateToChannel(channel.slug)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configure
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
