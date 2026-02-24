import { useState, useEffect } from 'react';
import { supabase, type Order, type OrderItem, type ChannelRawImport, type Customer, type OrderExport } from '../lib/supabase';
import { OrderExportPanel } from './OrderExportPanel';
import { OrderItemsTable } from './OrderItemsTable';
import { formatStructuredAddress } from '../lib/addressFormatter';
import {
  ArrowLeft,
  ShoppingCart,
  MapPin,
  FileText,
  User,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  RotateCw,
  AlertTriangle,
  Code,
} from 'lucide-react';

interface Props {
  orderId: string;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: RotateCw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-600', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export function WooCommerceOrderDetailView({ orderId, onClose }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [rawImport, setRawImport] = useState<ChannelRawImport | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [latestFailedExport, setLatestFailedExport] = useState<OrderExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRawData, setShowRawData] = useState(false);

  async function fetchData() {
    setLoading(true);

    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderData) {
      setOrder(orderData);

      const [itemsResult, rawResult, custResult, exportsResult] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', orderId).order('position'),
        orderData.external_order_id && orderData.channel_id
          ? supabase.from('channel_raw_imports').select('*')
              .eq('channel_id', orderData.channel_id)
              .eq('external_id', orderData.external_order_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        orderData.customer_id
          ? supabase.from('customers').select('*').eq('id', orderData.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('order_exports').select('*')
          .eq('order_id', orderId)
          .eq('export_status', 'failed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setItems(itemsResult.data ?? []);
      setRawImport(rawResult.data);
      setCustomer(custResult.data);
      setLatestFailedExport(exportsResult.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [orderId]);

  function handleItemsChange(updatedItems: OrderItem[]) {
    setItems(updatedItems);
  }

  function handleExported() {
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RotateCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-slate-600">Order not found</p>
        <button onClick={onClose} className="mt-4 text-blue-600 hover:underline">Go back</button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pl-16 lg:pl-0">
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-slate-600" />
            <h2 className="text-2xl font-bold text-slate-900">
              Order #{order.order_number || order.external_order_id || 'N/A'}
            </h2>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium ${statusConfig.color}`}>
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            WooCommerce order imported on {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <OrderItemsTable
              items={items}
              latestErrorResponse={latestFailedExport?.response_payload}
              onItemsChange={handleItemsChange}
            />
            <div className="px-6 py-4 bg-slate-50 border border-t-0 border-slate-200 rounded-b-xl -mt-3">
              <div className="flex justify-end gap-8 text-sm">
                <div className="text-slate-600">Shipping: <span className="font-medium text-slate-900">{order.currency} {order.shipping_total.toFixed(2)}</span></div>
                <div className="text-slate-600">Tax: <span className="font-medium text-slate-900">{order.currency} {order.tax_total.toFixed(2)}</span></div>
                {order.discount_total > 0 && (
                  <div className="text-slate-600">Discount: <span className="font-medium text-red-600">-{order.currency} {order.discount_total.toFixed(2)}</span></div>
                )}
                <div className="text-slate-900 font-semibold text-base">Total: {order.currency} {order.order_total.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {rawImport && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Raw Import Data</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${rawImport.import_status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {rawImport.import_status}
                  </span>
                </div>
                {showRawData ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
              </button>
              {showRawData && (
                <div className="px-6 pb-6">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                    {JSON.stringify(rawImport.raw_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <OrderExportPanel order={order} items={items} customer={customer} onExported={handleExported} />

          {customer && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Customer</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">Name</span>
                  <p className="font-medium text-slate-900">{customer.name}</p>
                </div>
                {customer.email && (
                  <div>
                    <span className="text-slate-500">Email</span>
                    <p className="text-slate-900">{customer.email}</p>
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <span className="text-slate-500">Phone</span>
                    <p className="text-slate-900">{customer.phone}</p>
                  </div>
                )}
                {customer.company && (
                  <div>
                    <span className="text-slate-500">Company</span>
                    <p className="text-slate-900">{customer.company}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Addresses</h3>
            </div>
            <div className="space-y-4 text-sm">
              {(() => {
                const deliveryAddress = formatStructuredAddress({
                  name: order.delivery_name,
                  address1: order.delivery_address1,
                  address2: order.delivery_address2,
                  address3: order.delivery_address3,
                  address4: order.delivery_address4,
                  address5: order.delivery_address5,
                  town: order.delivery_town,
                  county: order.delivery_county,
                  postcode: order.delivery_postcode,
                  country: order.delivery_country,
                  email: order.delivery_email,
                  telephone: order.delivery_telephone,
                  mobile: order.delivery_mobile,
                });
                return deliveryAddress ? (
                  <div>
                    <span className="text-slate-500 font-medium">Shipping</span>
                    <p className="text-slate-900 whitespace-pre-line mt-1">{deliveryAddress}</p>
                  </div>
                ) : null;
              })()}
              {(() => {
                const billingAddress = formatStructuredAddress({
                  name: order.billing_name,
                  address1: order.billing_address1,
                  address2: order.billing_address2,
                  address3: order.billing_address3,
                  address4: order.billing_address4,
                  address5: order.billing_address5,
                  town: order.billing_town,
                  county: order.billing_county,
                  postcode: order.billing_postcode,
                  country: order.billing_country,
                  email: order.billing_email,
                  telephone: order.billing_telephone,
                  mobile: order.billing_mobile,
                });
                return billingAddress ? (
                  <div>
                    <span className="text-slate-500 font-medium">Billing</span>
                    <p className="text-slate-900 whitespace-pre-line mt-1">{billingAddress}</p>
                  </div>
                ) : null;
              })()}
              {!formatStructuredAddress({
                name: order.delivery_name,
                address1: order.delivery_address1,
                address2: order.delivery_address2,
                address3: order.delivery_address3,
                town: order.delivery_town,
                county: order.delivery_county,
                postcode: order.delivery_postcode,
                country: order.delivery_country,
              }) && !formatStructuredAddress({
                name: order.billing_name,
                address1: order.billing_address1,
                address2: order.billing_address2,
                address3: order.billing_address3,
                town: order.billing_town,
                county: order.billing_county,
                postcode: order.billing_postcode,
                country: order.billing_country,
              }) && (
                <p className="text-slate-500 text-sm italic">No address information available</p>
              )}
            </div>
          </div>

          {order.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Notes</h3>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line">{order.notes}</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Details</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <span className="text-slate-900 font-medium">WooCommerce</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">External ID</span>
                <span className="text-slate-900 font-mono text-xs">{order.external_order_id || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currency</span>
                <span className="text-slate-900">{order.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-900">{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
