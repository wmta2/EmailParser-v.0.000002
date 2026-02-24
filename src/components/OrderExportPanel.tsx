import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  supabase,
  type Order,
  type OrderItem,
  type Customer,
  type OrderExport,
  type ErpDestination,
  type ErpConfiguration,
} from '../lib/supabase';
import { useOrderwiseExport } from '../hooks/useOrderwiseExport';
import { mapOrderToOrderwise } from '../lib/erp/orderwiseMapping';
import { JsonPreviewModal } from './JsonPreviewModal';
import {
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Server,
  ExternalLink,
  AlertTriangle,
  FileCode,
} from 'lucide-react';

interface Props {
  order: Order;
  items: OrderItem[];
  customer: Customer | null;
  onExported?: () => void;
}

export function OrderExportPanel({ order, items, customer, onExported }: Props) {
  const [destination, setDestination] = useState<ErpDestination | null>(null);
  const [config, setConfig] = useState<ErpConfiguration | null>(null);
  const [exports, setExports] = useState<OrderExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [showJsonModal, setShowJsonModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [destResult, exportsResult] = await Promise.all([
      supabase.from('erp_destinations').select('*').eq('slug', 'orderwise').eq('enabled', true).maybeSingle(),
      supabase.from('order_exports').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
    ]);

    const dest = destResult.data;
    setDestination(dest);
    setExports(exportsResult.data ?? []);

    if (dest) {
      const { data: configData } = await supabase
        .from('erp_configurations')
        .select('*')
        .eq('erp_destination_id', dest.id)
        .maybeSingle();
      setConfig(configData);
    }
    setLoading(false);
  }, [order.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const configData = useMemo(() => config?.config_data ?? {}, [config]);
  const creds = useMemo(() => config?.credentials ?? {}, [config]);

  const exportableItems = useMemo(() => items.filter(item => item.export_to_erp), [items]);

  const jsonPayload = useMemo(() => {
    const mappingConfig = {
      systemOrderType: configData.system_order_type ? Number(configData.system_order_type) : 1,
      orderType: configData.order_type_id ? Number(configData.order_type_id) : undefined,
      deliveryMethodId: configData.delivery_method_id ? Number(configData.delivery_method_id) : undefined,
      taxRateId: configData.tax_rate_id ? Number(configData.tax_rate_id) : undefined,
      stockLocationId: configData.stock_location_id ? Number(configData.stock_location_id) : undefined,
      currencyId: configData.currency_id ? Number(configData.currency_id) : undefined,
      paymentMethodId: configData.payment_method_id ? Number(configData.payment_method_id) : undefined,
      pricesAsNet: configData.prices_as_net === true || configData.prices_as_net === 'true',
    };
    return mapOrderToOrderwise(order, exportableItems, customer, mappingConfig, { filterByExportFlag: false });
  }, [configData, order, exportableItems, customer]);

  const { exporting, exportSingleOrder } = useOrderwiseExport(
    destination?.id ?? null,
    config?.id ?? null,
    configData,
    creds
  );

  const latestExport = exports[0] ?? null;
  const hasSuccessfulExport = exports.some(e => e.export_status === 'success');

  function toggleLog(id: string) {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleExport() {
    if (!destination || !config) return;
    try {
      await exportSingleOrder({ order, items: exportableItems, customer });
      await fetchData();
      onExported?.();
    } catch {
      await fetchData();
      onExported?.();
    }
  }

  function renderPanel() {
    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">ERP Export</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      );
    }

    if (!destination || !config) {
      const canExport = order.parsing_status === 'confirmed' || order.ow_export_status === 'export_failed';
      const configWarning = !destination ? 'No ERP destination is enabled.' : 'Orderwise is not configured yet.';

      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">ERP Export</h3>
          </div>
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">{configWarning}</p>
          </div>
          <div className="space-y-3">
            {canExport && (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg opacity-50 cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Export to Orderwise
              </button>
            )}
            <button
              onClick={() => setShowJsonModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <FileCode className="w-4 h-4" />
              Preview JSON Payload
            </button>
          </div>
          {exports.length > 0 && (
            <div className="border-t border-slate-100 pt-4 mt-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                {showHistory ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Export history ({exports.length})</span>
              </button>
              {showHistory && (
                <div className="mt-2 space-y-2">
                  {exports.map(exp => (
                    <div key={exp.id} className="space-y-1.5 pb-2 border-b border-slate-50 last:border-0">
                      <div className="flex items-center justify-between text-xs py-1.5">
                        <div className="flex items-center gap-2">
                          <ExportStatusBadge status={exp.export_status} />
                          <span className="text-slate-500">
                            {new Date(exp.created_at).toLocaleString()}
                          </span>
                        </div>
                        {exp.external_order_number && (
                          <span className="text-slate-600 font-mono">{exp.external_order_number}</span>
                        )}
                      </div>
                      {exp.error_message && (
                        <p className="text-xs text-red-600 ml-5">{exp.error_message}</p>
                      )}
                      <ExportLogDetail exp={exp} expanded={expandedLogs.has(exp.id)} onToggle={() => toggleLog(exp.id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (order.parsing_status === 'pending') {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-slate-900">ERP Export</h3>
          </div>
          <p className="text-sm text-amber-700">
            This order must be confirmed before it can be exported to ERP systems.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Orderwise Export</h3>
        </div>

        {hasSuccessfulExport && latestExport?.export_status === 'success' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Exported to Orderwise</p>
                {latestExport.external_order_number && (
                  <p className="text-green-700 flex items-center gap-1">
                    Order: {latestExport.external_order_number}
                    <ExternalLink className="w-3 h-3" />
                  </p>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Exported {latestExport.exported_at ? new Date(latestExport.exported_at).toLocaleString() : ''}
            </div>
          </div>
        ) : latestExport?.export_status === 'failed' ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm flex-1 min-w-0">
                <p className="font-medium text-red-800">Export failed</p>
                {latestExport.error_message && (
                  <p className="text-red-700 text-xs mt-1">{latestExport.error_message}</p>
                )}
              </div>
            </div>
            <ExportLogDetail exp={latestExport} expanded={expandedLogs.has(latestExport.id)} onToggle={() => toggleLog(latestExport.id)} />
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Upload className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Retrying...' : 'Retry Export'}
            </button>
          </div>
        ) : latestExport?.export_status === 'processing' ? (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <span className="text-sm font-medium text-blue-800">Exporting...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Send this order to Orderwise for fulfilment.
              {exportableItems.length < items.length && (
                <span className="block text-xs text-slate-500 mt-1">
                  {exportableItems.length} of {items.length} items selected for export
                </span>
              )}
            </p>
            <button
              onClick={handleExport}
              disabled={exporting || exportableItems.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Upload className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Exporting...' : 'Export to Orderwise'}
            </button>
            <button
              onClick={() => setShowJsonModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <FileCode className="w-4 h-4" />
              Preview JSON Payload
            </button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            {showHistory ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>Export history ({exports.length})</span>
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {exports.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No export attempts yet</p>
              ) : (
                exports.map(exp => (
                  <div key={exp.id} className="space-y-1.5 pb-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center justify-between text-xs py-1.5">
                      <div className="flex items-center gap-2">
                        <ExportStatusBadge status={exp.export_status} />
                        <span className="text-slate-500">
                          {new Date(exp.created_at).toLocaleString()}
                        </span>
                      </div>
                      {exp.external_order_number && (
                        <span className="text-slate-600 font-mono">{exp.external_order_number}</span>
                      )}
                    </div>
                    {exp.error_message && (
                      <p className="text-xs text-red-600 ml-5">{exp.error_message}</p>
                    )}
                    <ExportLogDetail exp={exp} expanded={expandedLogs.has(exp.id)} onToggle={() => toggleLog(exp.id)} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {renderPanel()}
      {showJsonModal && (
        <JsonPreviewModal
          title="Orderwise Export Preview"
          subtitle={`Order ${order.order_number || 'N/A'}${exportableItems.length < items.length ? ` (${exportableItems.length} of ${items.length} items)` : ''}`}
          json={jsonPayload}
          onClose={() => setShowJsonModal(false)}
        />
      )}
    </>
  );
}

function ExportLogDetail({ exp, expanded, onToggle }: { exp: OrderExport; expanded: boolean; onToggle: () => void }) {
  const hasResponse = exp.response_payload && Object.keys(exp.response_payload).length > 0;
  const hasRequest = exp.request_payload && Object.keys(exp.request_payload).length > 0;

  if (!hasResponse && !hasRequest) return null;

  const isSuccess = exp.export_status === 'success';
  const labelText = isSuccess ? 'export details' : 'error details';
  const IconComponent = isSuccess ? FileCode : AlertTriangle;
  const iconColor = isSuccess ? 'text-slate-400' : 'text-amber-500';

  return (
    <div className="ml-5">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <IconComponent className={`w-3 h-3 ${iconColor}`} />
        <span>{expanded ? 'Hide' : 'Show'} {labelText}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {hasRequest && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Request Payload</p>
              <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-64 overflow-y-auto">
                {JSON.stringify(exp.request_payload, null, 2)}
              </pre>
            </div>
          )}
          {hasResponse && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">API Response</p>
              <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-64 overflow-y-auto">
                {JSON.stringify(exp.response_payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExportStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: typeof Clock; color: string }> = {
    pending: { icon: Clock, color: 'text-amber-600' },
    processing: { icon: RefreshCw, color: 'text-blue-600' },
    success: { icon: CheckCircle, color: 'text-green-600' },
    failed: { icon: XCircle, color: 'text-red-600' },
  };

  const cfg = configs[status] || configs.pending;
  const Icon = cfg.icon;

  return <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />;
}
