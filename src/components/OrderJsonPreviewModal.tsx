import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, RefreshCw } from 'lucide-react';
import { supabase, type Order, type OrderItem, type Customer } from '../lib/supabase';
import { mapOrderToOrderwise, type MappingConfig } from '../lib/erp/orderwiseMapping';

interface OrderJsonPreviewModalProps {
  order: Order & { items?: OrderItem[] };
  onClose: () => void;
}

export function OrderJsonPreviewModal({ order, onClose }: OrderJsonPreviewModalProps) {
  const [json, setJson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    buildPreview();
  }, [order.id]);

  async function buildPreview() {
    setLoading(true);
    try {
      let customer: Customer | null = null;
      if (order.customer_id) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('id', order.customer_id)
          .maybeSingle();
        customer = data;
      }

      const { data: erpConfig } = await supabase
        .from('erp_configurations')
        .select('config_data')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const configData = erpConfig?.config_data ?? {};

      const mappingConfig: MappingConfig = {
        systemOrderType: configData.system_order_type ? Number(configData.system_order_type) : 1,
        orderType: configData.order_type_id ? Number(configData.order_type_id) : undefined,
        deliveryMethodId: configData.delivery_method_id ? Number(configData.delivery_method_id) : undefined,
        taxRateId: configData.tax_rate_id ? Number(configData.tax_rate_id) : undefined,
        stockLocationId: configData.stock_location_id ? Number(configData.stock_location_id) : undefined,
        currencyId: configData.currency_id ? Number(configData.currency_id) : undefined,
        paymentMethodId: configData.payment_method_id ? Number(configData.payment_method_id) : undefined,
        pricesAsNet: configData.prices_as_net === true || configData.prices_as_net === 'true',
      };

      const items: OrderItem[] = order.items ?? [];
      const payload = mapOrderToOrderwise(order, items, customer, mappingConfig);
      setJson(JSON.stringify(payload, null, 2));
    } catch (err) {
      setJson(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to generate preview' }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!json) return;
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Orderwise Export Preview</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Order {order.order_number || 'N/A'}
              {order.supplier_code && (
                <span className="ml-2 font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                  {order.supplier_code}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && json && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 p-4 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs overflow-auto h-full font-mono leading-relaxed">
              {json}
            </pre>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-400">
            This is a preview of the JSON payload that will be sent to Orderwise on export.
          </p>
        </div>
      </div>
    </div>
  );
}
