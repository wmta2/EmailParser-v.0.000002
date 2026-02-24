import { useState, useMemo, useEffect } from 'react';
import { useOrders, type EnrichedOrder } from '../hooks/useOrders';
import { supabase } from '../lib/supabase';
import { WooCommerceOrderDetailView } from './WooCommerceOrderDetailView';
import { ExportLogsView } from './ExportLogsView';
import { Pagination } from './Pagination';
import { SortableHeader, type SortDirection } from './SortableHeader';
import { useOrderwiseExport } from '../hooks/useOrderwiseExport';
import type { OrderExportPayload } from '../lib/erp/types';
import {
  Search,
  Filter,
  RefreshCw,
  ShoppingCart,
  Mail,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCw,
  Box,
  Server,
  Upload,
  Loader,
  FileText,
} from 'lucide-react';
import { ORDER_STATUS_CONFIG as STATUS_CONFIG } from '../lib/statusConfig';

const ITEMS_PER_PAGE = 20;

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  Mail,
  ShoppingCart,
  Package,
  Box,
};

function ChannelBadge({ iconName, name }: { iconName: string; name: string }) {
  const Icon = CHANNEL_ICONS[iconName] || Box;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
      <Icon className="w-3.5 h-3.5" />
      <span>{name}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function compareValues(a: unknown, b: unknown, direction: SortDirection): number {
  const aVal = a ?? '';
  const bVal = b ?? '';
  let result = 0;

  if (typeof aVal === 'number' && typeof bVal === 'number') {
    result = aVal - bVal;
  } else {
    result = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' });
  }

  return direction === 'asc' ? result : -result;
}

function getOrderSortValue(order: EnrichedOrder, key: string): unknown {
  switch (key) {
    case 'created_at': return order.created_at;
    case 'channel_name': return order.channel_name || order.channel_source;
    case 'order_number': return order.order_number;
    case 'customer_name': return order.customer_name || order.requester || '';
    case 'order_status': return order.order_status;
    case 'order_total': return order.order_total;
    default: return '';
  }
}

function ExportStatusIcon({ status }: { status?: string }) {
  if (!status) return <span className="text-slate-300" title="Not exported"><Server className="w-3.5 h-3.5" /></span>;
  if (status === 'success') return <span className="text-green-600" title="Exported"><CheckCircle className="w-3.5 h-3.5" /></span>;
  if (status === 'failed') return <span className="text-red-500" title="Export failed"><XCircle className="w-3.5 h-3.5" /></span>;
  if (status === 'processing') return <span className="text-blue-500" title="Exporting"><RefreshCw className="w-3.5 h-3.5 animate-spin" /></span>;
  return <span className="text-amber-500" title="Pending"><Clock className="w-3.5 h-3.5" /></span>;
}

export function OrdersPage() {
  const { orders, channels, loading, error, filters, setFilters, stats, fetchOrders } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<EnrichedOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'export-logs'>('orders');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [exportStatuses, setExportStatuses] = useState<Record<string, string>>({});
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [erpDestination, setErpDestination] = useState<any>(null);
  const [erpConfig, setErpConfig] = useState<any>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const erpConfigData = useMemo(() => erpConfig?.configuration || {}, [erpConfig]);
  const erpCredentials = useMemo(() => erpConfig?.credentials || {}, [erpConfig]);

  const { exportBatchOrders, progress, exporting } = useOrderwiseExport(
    erpDestination?.id || null,
    erpConfig?.id || null,
    erpConfigData,
    erpCredentials
  );

  useEffect(() => {
    async function fetchErpConfig() {
      const { data: dest } = await supabase
        .from('erp_destinations')
        .select('*')
        .eq('slug', 'orderwise')
        .maybeSingle();

      if (dest) {
        setErpDestination(dest);
        const { data: conf } = await supabase
          .from('erp_configurations')
          .select('*')
          .eq('erp_destination_id', dest.id)
          .maybeSingle();

        if (conf) {
          setErpConfig(conf);
        }
      }
    }
    fetchErpConfig();
  }, []);

  const orderIdsKey = useMemo(() => orders.map(o => o.id).sort().join(','), [orders]);

  useEffect(() => {
    if (!orderIdsKey) return;
    const orderIds = orderIdsKey.split(',');
    supabase
      .from('order_exports')
      .select('order_id, export_status')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const statuses: Record<string, string> = {};
        for (const row of data ?? []) {
          if (!statuses[row.order_id]) {
            statuses[row.order_id] = row.export_status;
          }
        }
        setExportStatuses(statuses);
      });
  }, [orderIdsKey]);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) =>
      compareValues(getOrderSortValue(a, sortKey), getOrderSortValue(b, sortKey), sortDirection)
    );
  }, [orders, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.size === paginatedOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      const newSelection = new Set<string>();
      paginatedOrders.forEach(order => {
        newSelection.add(order.id);
      });
      setSelectedOrderIds(newSelection);
    }
  };

  const handleToggleOrder = (orderId: string, isConfirmed: boolean) => {
    if (!isConfirmed) return;

    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleBulkExport = async () => {
    if (!erpConfig || !erpDestination) {
      alert('ERP is not configured. Please configure Orderwise settings first.');
      return;
    }

    if (selectedOrderIds.size === 0) {
      alert('Please select at least one order to export.');
      return;
    }

    setShowExportModal(true);

    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
    const payloads: OrderExportPayload[] = [];

    for (const order of selectedOrders) {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', order.customer_id!)
        .maybeSingle();

      payloads.push({
        order,
        items: items || [],
        customer: customer || undefined,
      });
    }

    try {
      await exportBatchOrders(payloads);
      await fetchOrders();
      setSelectedOrderIds(new Set());
    } catch (err) {
      console.error('Bulk export error:', err);
      alert('An error occurred during bulk export. Please check the logs.');
    }
  };

  const allSelectableSelected = paginatedOrders.length > 0 &&
    paginatedOrders.every(o => selectedOrderIds.has(o.id));

  if (selectedOrder) {
    return (
      <WooCommerceOrderDetailView
        orderId={selectedOrder.id}
        onClose={() => { setSelectedOrder(null); fetchOrders(); }}
      />
    );
  }

  const enabledChannels = channels.filter(c => c.enabled && c.slug !== 'email');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pl-16 lg:pl-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Channel Orders</h2>
          <p className="text-slate-600 mt-1">Orders from connected sales channels</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'orders' && selectedOrderIds.size > 0 && (
            <>
              <span className="text-sm text-slate-600">
                {selectedOrderIds.size} selected
              </span>
              <button
                onClick={handleBulkExport}
                disabled={exporting || !erpConfig}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Export Selected
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedOrderIds(new Set())}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Clear
              </button>
            </>
          )}
          <button
            onClick={() => fetchOrders()}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'orders'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            Orders List
          </button>
          <button
            onClick={() => setActiveTab('export-logs')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'export-logs'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Export Logs
          </button>
        </div>
      </div>

      {activeTab === 'export-logs' ? (
        <ExportLogsView />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={stats.total} icon={Package} color="text-slate-600" />
        {enabledChannels.map(ch => {
          const Icon = CHANNEL_ICONS[ch.icon_name] || Box;
          return (
            <StatCard
              key={ch.id}
              label={ch.name}
              value={stats.byChannel[ch.slug] || 0}
              icon={Icon}
              color="text-blue-600"
            />
          );
        })}
        <StatCard
          label="Completed"
          value={stats.byStatus['completed'] || 0}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatCard
          label="Processing"
          value={stats.byStatus['processing'] || 0}
          icon={RotateCw}
          color="text-blue-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search order number, customer, requester..."
              value={filters.search}
              onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <select
              value={filters.channelSource}
              onChange={(e) => handleFilterChange({ ...filters, channelSource: e.target.value })}
              className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            >
              <option value="all">All Channels</option>
              {enabledChannels.map(ch => (
                <option key={ch.slug} value={ch.slug}>{ch.name}</option>
              ))}
            </select>
            <select
              value={filters.orderStatus}
              onChange={(e) => handleFilterChange({ ...filters, orderStatus: e.target.value })}
              className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading orders...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-800">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No orders found</h3>
          <p className="text-slate-600">
            {filters.search || filters.channelSource !== 'all' || filters.orderStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No orders have been imported yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-center w-12">
                    <input
                      type="checkbox"
                      checked={allSelectableSelected}
                      onChange={handleSelectAll}
                      disabled={paginatedOrders.length === 0}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-50"
                    />
                  </th>
                  <SortableHeader label="Date" sortKey="created_at" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Channel" sortKey="channel_name" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Order #" sortKey="order_number" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Customer" sortKey="customer_name" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Status" sortKey="order_status" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Total" sortKey="order_total" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">ERP</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedOrders.map(order => {
                  const isSelected = selectedOrderIds.has(order.id);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleOrder(order.id, true);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          title=""
                        />
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <ChannelBadge iconName={order.channel_icon || 'Box'} name={order.channel_name || order.channel_source} />
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {order.order_number || '-'}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-slate-600 cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <div className="max-w-xs truncate">
                          {order.customer_name || order.requester || 'Unknown'}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <StatusBadge status={order.order_status} />
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {order.order_total > 0
                          ? `${order.currency} ${order.order_total.toFixed(2)}`
                          : '-'}
                      </td>
                      <td
                        className="px-4 py-4 whitespace-nowrap text-center cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <ExportStatusIcon status={exportStatuses[order.id]} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                          className="text-slate-900 hover:text-slate-700 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sortedOrders.length)} of {sortedOrders.length} orders
            </p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      )}

      {showExportModal && progress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Exporting Orders</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Progress</span>
                  <span className="text-slate-900 font-medium">
                    {progress.completed} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  />
                </div>
              </div>

              {exporting && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Processing: {progress.current}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-green-600 font-medium">Succeeded</div>
                  <div className="text-green-900 text-lg font-bold">{progress.succeeded}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-red-600 font-medium">Failed</div>
                  <div className="text-red-900 text-lg font-bold">{progress.failed}</div>
                </div>
              </div>

              {!exporting && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowExportModal(false);
                      setSelectedOrderIds(new Set());
                      setActiveTab('export-logs');
                    }}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    View Export Logs
                  </button>
                  <button
                    onClick={() => {
                      setShowExportModal(false);
                      setSelectedOrderIds(new Set());
                    }}
                    className="w-full px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Package; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className="w-8 h-8 text-slate-300" />
      </div>
    </div>
  );
}
