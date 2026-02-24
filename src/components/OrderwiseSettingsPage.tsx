import { useState, useEffect, useCallback } from 'react';
import { useErpConfig, useErpServices, useErpSyncLogs } from '../hooks/useErpDestinations';
import { useOrderwiseExport } from '../hooks/useOrderwiseExport';
import { useOrderwiseApiLogs } from '../hooks/useOrderwiseApiLogs';
import { useOrderwiseCustomerSync } from '../hooks/useOrderwiseCustomerSync';
import { supabase, type ErpDestination } from '../lib/supabase';
import { OrderwiseAdapter } from '../lib/erp/orderwiseAdapter';
import type { ValueListItem } from '../lib/erp/types';
import { useTempMessage } from '../hooks/useTempMessage';
import { cleanOrderwiseUrl } from '../lib/urlUtils';
import { ORDERWISE_VALUE_LISTS } from '../lib/constants';
import { ConnectionSection } from './orderwise/ConnectionSection';
import { MappingSection } from './orderwise/MappingSection';
import { CustomerSyncSection } from './orderwise/CustomerSyncSection';
import { ServicesSection } from './orderwise/ServicesSection';
import { SyncHistorySection } from './orderwise/SyncHistorySection';
import {
  Server,
  Save,
  ArrowLeft,
  RefreshCw,
  Clock,
  FileText,
  AlertCircle,
  Activity,
  CheckCircle,
} from 'lucide-react';

interface Props {
  onBack?: () => void;
  onNavigateToLogs?: () => void;
}

export function OrderwiseSettingsPage({ onBack, onNavigateToLogs }: Props) {
  const [destination, setDestination] = useState<ErpDestination | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'live'>('sandbox');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, showSaveMessage] = useTempMessage();

  const [systemOrderType, setSystemOrderType] = useState('1');
  const [orderTypeId, setOrderTypeId] = useState('');
  const [deliveryMethodId, setDeliveryMethodId] = useState('');
  const [taxRateId, setTaxRateId] = useState('');
  const [stockLocationId, setStockLocationId] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [pricesAsNet, setPricesAsNet] = useState(false);

  const [valueLists, setValueLists] = useState<Record<number, ValueListItem[]>>({});
  const [loadingLists, setLoadingLists] = useState<Record<number, boolean>>({});
  const [customerSyncMessage, showCustomerSyncMessage] = useTempMessage(10000);

  useEffect(() => {
    supabase
      .from('erp_destinations')
      .select('*')
      .eq('slug', 'orderwise')
      .maybeSingle()
      .then(({ data }) => setDestination(data));
  }, []);

  const destId = destination?.id ?? null;
  const { config, loading: configLoading, saveConfig } = useErpConfig(destId);
  const { services, loading: servicesLoading, toggleService } = useErpServices(destId);
  const { logs, loading: logsLoading } = useErpSyncLogs(destId, 10);
  const { stats: apiLogStats, logs: recentApiLogs } = useOrderwiseApiLogs(destId, 5);
  const { syncing: customerSyncing, progress: customerProgress, stats: customerStats, syncCustomers, fetchSyncLogs, fetchSyncItems } = useOrderwiseCustomerSync();

  const configData = config?.config_data ?? {};
  const creds = config?.credentials ?? {};
  const configId = config?.id ?? null;

  const {
    testResult,
    testing,
    testConnection,
  } = useOrderwiseExport(destId, configId, configData, creds);

  useEffect(() => {
    if (config) {
      const url = cleanOrderwiseUrl(config.credentials?.base_url || '');
      setBaseUrl(url);
      setUsername(config.credentials?.username || '');
      setPassword(config.credentials?.password || '');
      setSessionId(String(config.credentials?.session_id || config.config_data?.session_id || ''));
      setEnvironment((config.config_data?.environment as 'sandbox' | 'live') || 'sandbox');
      setSystemOrderType(String(config.config_data?.system_order_type || '1'));
      setOrderTypeId(String(config.config_data?.order_type_id || ''));
      setDeliveryMethodId(String(config.config_data?.delivery_method_id || ''));
      setTaxRateId(String(config.config_data?.tax_rate_id || ''));
      setStockLocationId(String(config.config_data?.stock_location_id || ''));
      setCurrencyId(String(config.config_data?.currency_id || ''));
      setPaymentMethodId(String(config.config_data?.payment_method_id || ''));
      setPricesAsNet(config.config_data?.prices_as_net === true);
    }
  }, [config]);

  const fetchValueList = useCallback(async (listId: number) => {
    if (valueLists[listId] || loadingLists[listId]) return;
    if (!baseUrl || !username || !password) return;

    setLoadingLists(prev => ({ ...prev, [listId]: true }));
    try {
      const adapter = new OrderwiseAdapter();
      const items = await adapter.fetchValueList!(
        { base_url: baseUrl, username, password, environment },
        listId,
        destId || undefined,
        configId || undefined
      );
      setValueLists(prev => ({ ...prev, [listId]: items }));
    } catch {
      setValueLists(prev => ({ ...prev, [listId]: [] }));
    } finally {
      setLoadingLists(prev => ({ ...prev, [listId]: false }));
    }
  }, [baseUrl, username, password, environment, valueLists, loadingLists, destId, configId]);

  async function handleSave() {
    setSaving(true);
    try {
      const cleanedUrl = cleanOrderwiseUrl(baseUrl);

      await saveConfig(
        {
          session_id: parseInt(sessionId) || 0,
          environment,
          system_order_type: parseInt(systemOrderType) || 1,
          order_type_id: parseInt(orderTypeId) || null,
          delivery_method_id: parseInt(deliveryMethodId) || null,
          tax_rate_id: parseInt(taxRateId) || null,
          stock_location_id: parseInt(stockLocationId) || null,
          currency_id: parseInt(currencyId) || null,
          payment_method_id: parseInt(paymentMethodId) || null,
          prices_as_net: pricesAsNet,
        },
        {
          base_url: cleanedUrl,
          username,
          password,
          environment,
          session_id: parseInt(sessionId) || 0,
        }
      );
      showSaveMessage('Configuration saved successfully');
    } catch (err) {
      showSaveMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    const cleanedUrl = cleanOrderwiseUrl(baseUrl);

    const overrideCredentials = {
      base_url: cleanedUrl,
      username,
      password,
      environment,
    };
    await testConnection(overrideCredentials);
  }

  async function handleCustomerSync() {
    if (!destId) return;
    const result = await syncCustomers(destId, true);
    if (result.success) {
      const addrMsg = result.addressStats && result.addressStats.fetched > 0
        ? ` | Addresses: ${result.addressStats.fetched} fetched, ${result.addressStats.created} created, ${result.addressStats.updated} updated`
        : '';
      showCustomerSyncMessage(
        `Success! Fetched ${result.stats.fetched} customers: ${result.stats.created} created, ${result.stats.updated} updated, ${result.stats.skipped} skipped${addrMsg}`
      );
    } else {
      showCustomerSyncMessage(`Error: ${result.error}`);
    }
  }

  const hasUnsavedChanges = () => {
    if (!config) return false;
    const savedUrl = cleanOrderwiseUrl(config.credentials?.base_url || '');
    const savedEnv = (config.config_data?.environment as 'sandbox' | 'live') || 'sandbox';
    return (
      cleanOrderwiseUrl(baseUrl) !== savedUrl ||
      username !== (config.credentials?.username || '') ||
      password !== (config.credentials?.password || '') ||
      environment !== savedEnv
    );
  };

  if (configLoading || !destination) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">Loading Orderwise settings...</p>
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
            <Server className="w-7 h-7 text-slate-700" />
            <h2 className="text-3xl font-bold text-slate-900">Orderwise</h2>
          </div>
          <p className="text-slate-600 mt-1">Configure your Orderwise ERP connection and export settings</p>
        </div>
      </div>

      {apiLogStats && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Connection Health</h3>
            {onNavigateToLogs && (
              <button
                onClick={onNavigateToLogs}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View All Logs
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-600">API Calls (24h)</p>
                <p className="text-lg font-semibold text-slate-900">{apiLogStats.total24h}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-slate-600">Success Rate</p>
                <p className="text-lg font-semibold text-slate-900">{apiLogStats.successRate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-600" />
              <div>
                <p className="text-xs text-slate-600">Avg Duration</p>
                <p className="text-lg font-semibold text-slate-900">{apiLogStats.avgDuration}ms</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-5 h-5 ${apiLogStats.mostRecentError ? 'text-red-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs text-slate-600">Recent Errors</p>
                <p className={`text-lg font-semibold ${apiLogStats.mostRecentError ? 'text-red-600' : 'text-slate-900'}`}>
                  {apiLogStats.mostRecentError ? '1' : '0'}
                </p>
              </div>
            </div>
          </div>
          {apiLogStats.mostRecentError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-900 mb-1">Most Recent Error:</p>
              <p className="text-xs text-red-700">{apiLogStats.mostRecentError}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ConnectionSection
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            sessionId={sessionId}
            setSessionId={setSessionId}
            environment={environment}
            setEnvironment={setEnvironment}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            testing={testing}
            testResult={testResult}
            onTest={handleTest}
            hasUnsavedChanges={hasUnsavedChanges()}
          />

          <MappingSection
            systemOrderType={systemOrderType}
            setSystemOrderType={setSystemOrderType}
            orderTypeId={orderTypeId}
            setOrderTypeId={setOrderTypeId}
            deliveryMethodId={deliveryMethodId}
            setDeliveryMethodId={setDeliveryMethodId}
            taxRateId={taxRateId}
            setTaxRateId={setTaxRateId}
            stockLocationId={stockLocationId}
            setStockLocationId={setStockLocationId}
            currencyId={currencyId}
            setCurrencyId={setCurrencyId}
            paymentMethodId={paymentMethodId}
            setPaymentMethodId={setPaymentMethodId}
            pricesAsNet={pricesAsNet}
            setPricesAsNet={setPricesAsNet}
            valueLists={valueLists}
            loadingLists={loadingLists}
            fetchValueList={fetchValueList}
            hasCredentials={!!(baseUrl && username && password)}
          />

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
          <CustomerSyncSection
            syncing={customerSyncing}
            progress={customerProgress}
            stats={customerStats}
            onSync={handleCustomerSync}
            message={customerSyncMessage}
            hasCredentials={!!(baseUrl && username && password)}
            erpDestinationId={destId}
            fetchSyncLogs={fetchSyncLogs}
            fetchSyncItems={fetchSyncItems}
          />

          <ServicesSection
            services={services}
            loading={servicesLoading}
            onToggle={toggleService}
          />

          <SyncHistorySection logs={logs} loading={logsLoading} />
        </div>
      </div>
    </div>
  );
}
