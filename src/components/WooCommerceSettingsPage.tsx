import { useState, useEffect } from 'react';
import { useChannelConfig, useChannelSyncLog } from '../hooks/useChannels';
import { useWooCommerceSync } from '../hooks/useWooCommerce';
import { getChannelBySlug } from '../lib/channels/channelRegistry';
import type { SalesChannel } from '../lib/supabase';
import { useTempMessage } from '../hooks/useTempMessage';
import {
  ShoppingCart,
  Save,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';

interface Props {
  onBack?: () => void;
}

export function WooCommerceSettingsPage({ onBack }: Props) {
  const [channel, setChannel] = useState<SalesChannel | null>(null);
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [importStatuses, setImportStatuses] = useState('processing,completed,on-hold');
  const [perPage, setPerPage] = useState('50');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, showSaveMessage] = useTempMessage();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getChannelBySlug('woocommerce').then(setChannel);
  }, []);

  const { config, loading: configLoading, saveConfig } = useChannelConfig(channel?.id ?? null);
  const { logs, loading: logsLoading, fetchLogs } = useChannelSyncLog(channel?.id ?? null, 10);
  const { syncing, progress, lastResult, testConnection, syncNow } = useWooCommerceSync(channel, config);

  useEffect(() => {
    if (config) {
      setStoreUrl(config.credentials?.store_url || config.config_data?.store_url || '');
      setConsumerKey(config.credentials?.consumer_key || '');
      setConsumerSecret(config.credentials?.consumer_secret || '');
      setImportStatuses(config.config_data?.import_statuses || 'processing,completed,on-hold');
      setPerPage(String(config.config_data?.per_page || 50));
    }
  }, [config]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveConfig(
        { store_url: storeUrl, import_statuses: importStatuses, per_page: parseInt(perPage) || 50 },
        { store_url: storeUrl, consumer_key: consumerKey, consumer_secret: consumerSecret }
      );
      showSaveMessage('Configuration saved successfully');
    } catch (err) {
      showSaveMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection();
    setTestResult(result);
    setTesting(false);
  }

  async function handleSync() {
    await syncNow();
    fetchLogs();
  }

  if (configLoading || !channel) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">Loading WooCommerce settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pl-16 lg:pl-0">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-7 h-7 text-slate-700" />
            <h2 className="text-3xl font-bold text-slate-900">WooCommerce</h2>
          </div>
          <p className="text-slate-600 mt-1">Configure your WooCommerce store connection and sync settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Connection</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Store URL</label>
                <input
                  type="text"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://yourstore.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Consumer Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={consumerKey}
                    onChange={(e) => setConsumerKey(e.target.value)}
                    placeholder="ck_..."
                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm font-mono"
                  />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Consumer Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={consumerSecret}
                    onChange={(e) => setConsumerSecret(e.target.value)}
                    placeholder="cs_..."
                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm font-mono"
                  />
                  <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleTest}
                  disabled={testing || !storeUrl || !consumerKey || !consumerSecret}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <Zap className={`w-4 h-4 ${testing ? 'animate-pulse' : ''}`} />
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Import Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Order Statuses to Import</label>
                <input
                  type="text"
                  value={importStatuses}
                  onChange={(e) => setImportStatuses(e.target.value)}
                  placeholder="processing,completed,on-hold"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Comma-separated WooCommerce statuses</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Orders Per Page</label>
                <input
                  type="number"
                  value={perPage}
                  onChange={(e) => setPerPage(e.target.value)}
                  min="1"
                  max="100"
                  className="w-32 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Sync Controls</h3>
            <button
              onClick={handleSync}
              disabled={syncing || !config}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>

            {progress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600">{progress.message}</span>
                  {progress.total > 0 && (
                    <span className="text-slate-500">{progress.current}/{progress.total}</span>
                  )}
                </div>
                {progress.total > 0 && (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {lastResult && !syncing && (
              <div className={`mt-4 p-4 rounded-lg ${lastResult.success ? 'bg-green-50' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {lastResult.success
                    ? <CheckCircle className="w-5 h-5 text-green-600" />
                    : <AlertTriangle className="w-5 h-5 text-amber-600" />
                  }
                  <span className={`font-medium ${lastResult.success ? 'text-green-800' : 'text-amber-800'}`}>
                    Sync {lastResult.success ? 'Complete' : 'Completed with Issues'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-green-700">Imported: {lastResult.imported}</div>
                  <div className="text-slate-600">Skipped: {lastResult.skipped}</div>
                  <div className="text-red-700">Failed: {lastResult.failed}</div>
                </div>
                {lastResult.errors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {lastResult.errors.slice(0, 3).map((err, i) => (
                      <p key={i} className="text-xs text-red-700 truncate">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Recent Sync History</h3>
            </div>
            {logsLoading ? (
              <div className="p-6 text-center text-slate-500">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No sync history yet</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {logs.map(log => (
                  <SyncLogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncLogRow({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    started: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
  };

  const duration = log.completed_at && log.started_at
    ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
    : null;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[log.status] || 'bg-slate-100 text-slate-600'}`}>
            {log.status}
          </span>
          <span className="text-sm text-slate-600">
            {new Date(log.started_at).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="text-green-600">{log.orders_imported} imported</span>
          {log.orders_failed > 0 && <span className="text-red-600">{log.orders_failed} failed</span>}
          {duration !== null && <span>{duration}s</span>}
          <Clock className="w-3.5 h-3.5" />
        </div>
      </button>
      {expanded && log.error_details && (
        <div className="px-6 pb-4">
          <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs overflow-x-auto max-h-40 overflow-y-auto">
            {JSON.stringify(log.error_details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
