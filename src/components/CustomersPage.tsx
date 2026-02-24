import { useState, useMemo, useEffect } from 'react';
import { useCustomers, useCustomerDetail, type CustomerWithStats } from '../hooks/useCustomers';
import { useCustomerDeliveryAddressSync, type SyncResult } from '../hooks/useCustomerDeliveryAddressSync';
import { EmailDetailView } from './EmailDetailView';
import { WooCommerceOrderDetailView } from './WooCommerceOrderDetailView';
import { Pagination } from './Pagination';
import { SortableHeader, type SortDirection } from './SortableHeader';
import { type Order, type CustomerDeliveryAddress, type DeliveryAddressSyncLog, type DeliveryAddressSyncItem } from '../lib/supabase';
import {
  SyncAddressListModal,
  AddressDetailModal,
  SyncLogDetailModal,
  SyncHistoryPanel,
} from './DeliveryAddressSyncModals';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Mail,
  ShoppingCart,
  Box,
  Package,
  Server,
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Building,
  Link2,
  XCircle,
  ExternalLink,
  DollarSign,
  Hash,
  AlertCircle,
  Clock,
  Truck,
  CheckCircle,
  History,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  Mail,
  ShoppingCart,
  Package,
  Box,
  Server,
};

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

function getCustomerSortValue(customer: CustomerWithStats, key: string): unknown {
  switch (key) {
    case 'name': return customer.name || '';
    case 'email': return customer.email || '';
    case 'company': return customer.company || '';
    case 'account_number': return customer.account_number || '';
    case 'channel_name': return customer.channel_name || '';
    case 'order_count': return customer.order_count;
    case 'last_order_date': return customer.last_order_date || '';
    default: return '';
  }
}

export function OrderwiseCustomersPage() {
  const {
    customers,
    channels,
    loading,
    error,
    search,
    setSearch,
    channelFilter,
    setChannelFilter,
    fetchCustomers,
  } = useCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) =>
      compareValues(getCustomerSortValue(a, sortKey), getCustomerSortValue(b, sortKey), sortDirection)
    );
  }, [customers, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleChannelFilterChange = (value: string) => {
    setChannelFilter(value);
    setCurrentPage(1);
  };

  if (selectedCustomerId) {
    return (
      <CustomerDetailPanel
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pl-16 lg:pl-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">OW Customers</h2>
          <p className="text-slate-600 mt-1">Customers synced from Orderwise ERP</p>
        </div>
        <button
          onClick={fetchCustomers}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, company..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <select
              value={channelFilter}
              onChange={(e) => handleChannelFilterChange(e.target.value)}
              className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            >
              <option value="all">All ERP Sources</option>
              {channels.filter(ch => ch.source_type === 'erp_destination').map(ch => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading customers...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-800">{error}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No customers found</h3>
          <p className="text-slate-600">
            {search || channelFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Customers will appear here after syncing from Orderwise'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <SortableHeader label="Name" sortKey="name" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Account No." sortKey="account_number" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Email" sortKey="email" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Source" sortKey="channel_name" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Orders" sortKey="order_count" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} align="right" />
                  <SortableHeader label="Last Order" sortKey="last_order_date" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedCustomers.map(cust => {
                  const ChannelIcon = CHANNEL_ICONS[cust.channel_icon || ''] || Box;
                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCustomerId(cust.id)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{cust.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">{cust.account_number || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cust.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <ChannelIcon className="w-3.5 h-3.5" />
                          {cust.channel_name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 text-right font-medium">{cust.order_count}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {cust.last_order_date ? new Date(cust.last_order_date).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sortedCustomers.length)} of {sortedCustomers.length} customers
            </p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      )}
    </div>
  );
}

function buildAddress(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join('\n');
}

type ModalState =
  | { type: 'none' }
  | { type: 'addressList'; syncLogId: string; actionFilter: 'created' | 'updated' }
  | { type: 'addressDetail'; item: DeliveryAddressSyncItem; returnTo?: { syncLogId: string; actionFilter: 'created' | 'updated' } }
  | { type: 'syncLogDetail'; log: DeliveryAddressSyncLog }
  | { type: 'syncHistory' };

function DeliveryAddressesCard({
  customerId,
  orderwiseId,
}: {
  customerId: string;
  orderwiseId: number | null;
}) {
  const {
    syncing,
    error,
    syncDeliveryAddresses,
    fetchDeliveryAddresses,
    fetchLastSyncLog,
    fetchSyncItems,
    fetchSyncHistory,
  } = useCustomerDeliveryAddressSync();
  const [addresses, setAddresses] = useState<CustomerDeliveryAddress[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });

  useEffect(() => {
    fetchDeliveryAddresses(customerId).then(setAddresses);
    fetchLastSyncLog(customerId).then(log => {
      if (log?.completed_at) setLastSynced(log.completed_at);
    });
  }, [customerId, fetchDeliveryAddresses, fetchLastSyncLog]);

  async function handleSync() {
    if (orderwiseId == null) return;
    setLastSyncResult(null);
    const result = await syncDeliveryAddresses(customerId, orderwiseId);
    setLastSyncResult(result);
    if (result.success) {
      const updated = await fetchDeliveryAddresses(customerId);
      setAddresses(updated);
      setLastSynced(new Date().toISOString());
    }
  }

  function handleCreatedClick() {
    if (lastSyncResult?.syncLogId && lastSyncResult.created > 0) {
      setModalState({ type: 'addressList', syncLogId: lastSyncResult.syncLogId, actionFilter: 'created' });
    }
  }

  function handleUpdatedClick() {
    if (lastSyncResult?.syncLogId && lastSyncResult.updated > 0) {
      setModalState({ type: 'addressList', syncLogId: lastSyncResult.syncLogId, actionFilter: 'updated' });
    }
  }

  function handleAddressSelect(item: DeliveryAddressSyncItem) {
    if (modalState.type === 'addressList') {
      setModalState({
        type: 'addressDetail',
        item,
        returnTo: { syncLogId: modalState.syncLogId, actionFilter: modalState.actionFilter },
      });
    } else {
      setModalState({ type: 'addressDetail', item });
    }
  }

  function handleAddressDetailBack() {
    if (modalState.type === 'addressDetail' && modalState.returnTo) {
      setModalState({
        type: 'addressList',
        syncLogId: modalState.returnTo.syncLogId,
        actionFilter: modalState.returnTo.actionFilter,
      });
    } else {
      setModalState({ type: 'none' });
    }
  }

  function handleSelectLogFromHistory(log: DeliveryAddressSyncLog) {
    setModalState({ type: 'syncLogDetail', log });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Delivery Addresses</h3>
          {addresses.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {addresses.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalState({ type: 'syncHistory' })}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="View sync history"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || orderwiseId == null}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {lastSynced && !lastSyncResult && (
        <p className="text-xs text-slate-400 mb-3">
          Last synced {new Date(lastSynced).toLocaleString()}
        </p>
      )}

      {lastSyncResult && (
        <div className={`mb-3 p-2.5 rounded-lg flex items-start gap-2 text-xs ${
          lastSyncResult.success
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {lastSyncResult.success ? (
            <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          )}
          {lastSyncResult.success ? (
            <span>
              Sync complete:{' '}
              {lastSyncResult.created > 0 ? (
                <button
                  onClick={handleCreatedClick}
                  className="font-medium text-green-700 hover:underline"
                >
                  {lastSyncResult.created} created
                </button>
              ) : (
                <span>{lastSyncResult.created} created</span>
              )}
              ,{' '}
              {lastSyncResult.updated > 0 ? (
                <button
                  onClick={handleUpdatedClick}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {lastSyncResult.updated} updated
                </button>
              ) : (
                <span>{lastSyncResult.updated} updated</span>
              )}
              {lastSyncResult.skipped > 0 && `, ${lastSyncResult.skipped} skipped`}.
            </span>
          ) : (
            <span>{lastSyncResult.error || 'Sync failed'}</span>
          )}
        </div>
      )}

      {error && !lastSyncResult && (
        <div className="mb-3 p-2.5 rounded-lg flex items-start gap-2 text-xs bg-red-50 border border-red-200 text-red-800">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {orderwiseId == null && (
        <p className="text-xs text-amber-600">No Orderwise ID — cannot sync delivery addresses.</p>
      )}

      {addresses.length === 0 && orderwiseId != null && !syncing && (
        <p className="text-sm text-slate-400 text-center py-4">
          No delivery addresses yet. Click Sync to import from Orderwise.
        </p>
      )}

      {addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map(addr => {
            const lines = [
              addr.address1,
              addr.address2,
              addr.address3,
              addr.town,
              addr.county,
              addr.postcode,
              addr.country,
            ].filter(Boolean);

            return (
              <div
                key={addr.id}
                className={`rounded-lg border p-3 text-sm ${
                  addr.is_default
                    ? 'border-slate-300 bg-slate-50'
                    : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-slate-900">{addr.name || 'Unnamed address'}</span>
                  {addr.is_default && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 whitespace-nowrap flex-shrink-0">
                      Default
                    </span>
                  )}
                </div>
                {addr.contact_name && (
                  <p className="text-slate-500 text-xs mb-1">{addr.contact_name}</p>
                )}
                {lines.length > 0 && (
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed text-xs">
                    {lines.join('\n')}
                  </p>
                )}
                {addr.telephone && (
                  <p className="text-slate-500 text-xs mt-1">{addr.telephone}</p>
                )}
                {addr.email && (
                  <p className="text-slate-500 text-xs mt-0.5">{addr.email}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalState.type === 'addressList' && (
        <SyncAddressListModal
          syncLogId={modalState.syncLogId}
          actionFilter={modalState.actionFilter}
          onClose={() => setModalState({ type: 'none' })}
          onSelectAddress={handleAddressSelect}
          fetchSyncItems={fetchSyncItems}
        />
      )}

      {modalState.type === 'addressDetail' && (
        <AddressDetailModal
          item={modalState.item}
          onClose={() => setModalState({ type: 'none' })}
          onBack={modalState.returnTo ? handleAddressDetailBack : undefined}
        />
      )}

      {modalState.type === 'syncLogDetail' && (
        <SyncLogDetailModal
          syncLog={modalState.log}
          onClose={() => setModalState({ type: 'syncHistory' })}
        />
      )}

      {modalState.type === 'syncHistory' && (
        <SyncHistoryPanel
          customerId={customerId}
          onClose={() => setModalState({ type: 'none' })}
          onSelectLog={handleSelectLogFromHistory}
          fetchSyncHistory={fetchSyncHistory}
        />
      )}
    </div>
  );
}

function formatCurrency(val: string | null | undefined): string {
  if (!val) return '-';
  const n = parseFloat(val);
  return isNaN(n) ? val : `£${n.toFixed(2)}`;
}

function CustomerDetailPanel({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { customer, mappings, orders, loading } = useCustomerDetail(customerId);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  if (selectedOrder) {
    if (selectedOrder.channel_source === 'email' && selectedOrder.raw_email_id) {
      return (
        <EmailDetailView
          emailId={selectedOrder.raw_email_id}
          onClose={() => setSelectedOrder(null)}
        />
      );
    }
    return (
      <WooCommerceOrderDetailView
        orderId={selectedOrder.id}
        onClose={() => setSelectedOrder(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Customer not found</p>
        <button onClick={onClose} className="mt-4 text-blue-600 hover:underline">Go back</button>
      </div>
    );
  }

  const shippingAddress = buildAddress([
    customer.shipping_name !== customer.name ? customer.shipping_name : null,
    customer.shipping_address1,
    customer.shipping_address2,
    customer.shipping_address3,
    customer.shipping_town,
    customer.shipping_county,
    customer.shipping_postcode,
    customer.shipping_country,
  ]);

  const billingAddress = buildAddress([
    customer.billing_name,
    customer.billing_address1,
    customer.billing_address2,
    customer.billing_address3,
    customer.billing_town,
    customer.billing_county,
    customer.billing_postcode,
    customer.billing_country,
  ]);

  const isOnHold = customer.on_hold || customer.manual_on_hold;

  const hasFinancials =
    customer.balance != null ||
    customer.credit_limit != null ||
    customer.available_to_spend != null ||
    customer.open_orders_value != null ||
    customer.over_credit_terms != null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pl-16 lg:pl-0">
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>
            {customer.account_number && (
              <span className="text-sm font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {customer.account_number}
              </span>
            )}
            {isOnHold && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700">
                <AlertCircle className="w-3 h-3" />
                On Hold
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">Customer details and order history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Information</h3>
            </div>
            <div className="space-y-3 text-sm">
              {customer.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-900 break-all">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-900">{customer.phone}</span>
                </div>
              )}
              {customer.company && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-900">{customer.company}</span>
                </div>
              )}
              {customer.account_number && (
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-900">{customer.account_number}</span>
                </div>
              )}
              {customer.vat_number && (
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-500 text-xs">VAT:</span>
                  <span className="text-slate-900">{customer.vat_number}</span>
                </div>
              )}
              {customer.last_amended_at && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-500 text-xs">Last amended:</span>
                  <span className="text-slate-700">{new Date(customer.last_amended_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {hasFinancials && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Financials</h3>
              </div>
              <div className="space-y-3 text-sm">
                {customer.balance != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Balance</span>
                    <span className="font-medium text-slate-900">{formatCurrency(customer.balance)}</span>
                  </div>
                )}
                {customer.credit_limit != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Credit Limit</span>
                    <span className="font-medium text-slate-900">{formatCurrency(customer.credit_limit)}</span>
                  </div>
                )}
                {customer.available_to_spend != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Available to Spend</span>
                    <span className="font-medium text-slate-900">{formatCurrency(customer.available_to_spend)}</span>
                  </div>
                )}
                {customer.open_orders_value != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Open Orders Value</span>
                    <span className="font-medium text-slate-900">{formatCurrency(customer.open_orders_value)}</span>
                  </div>
                )}
                {customer.over_credit_terms != null && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Over Credit Terms</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      customer.over_credit_terms ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {customer.over_credit_terms ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {(shippingAddress || billingAddress) && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Addresses</h3>
              </div>
              <div className="space-y-4 text-sm">
                {shippingAddress && (
                  <div>
                    <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Shipping</span>
                    <p className="text-slate-900 whitespace-pre-line mt-1 leading-relaxed">{shippingAddress}</p>
                    {customer.shipping_telephone && customer.shipping_telephone !== customer.phone && (
                      <p className="text-slate-500 text-xs mt-1">{customer.shipping_telephone}</p>
                    )}
                    {customer.shipping_email && customer.shipping_email !== customer.email && (
                      <p className="text-slate-500 text-xs mt-0.5">{customer.shipping_email}</p>
                    )}
                  </div>
                )}
                {billingAddress && (
                  <div className={shippingAddress ? 'pt-3 border-t border-slate-100' : ''}>
                    <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Billing</span>
                    <p className="text-slate-900 whitespace-pre-line mt-1 leading-relaxed">{billingAddress}</p>
                    {customer.billing_telephone && (
                      <p className="text-slate-500 text-xs mt-1">{customer.billing_telephone}</p>
                    )}
                    {customer.billing_email && customer.billing_email !== customer.email && (
                      <p className="text-slate-500 text-xs mt-0.5">{customer.billing_email}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DeliveryAddressesCard
            customerId={customer.id}
            orderwiseId={customer.orderwise_id}
          />

          {mappings.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Source Mappings</h3>
              </div>
              <div className="space-y-3">
                {mappings.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg p-3">
                    <div>
                      <span className="font-medium text-slate-900 capitalize">{m.external_system}</span>
                      <p className="text-slate-500 font-mono text-xs">{m.external_customer_id}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      m.mapping_status === 'mapped' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {m.mapping_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Orders ({orders.length})</h3>
            </div>
            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No orders found for this customer</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Order #</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {orders.map(order => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-6 py-3 text-sm text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{order.order_number || '-'}</td>
                        <td className="px-6 py-3 text-sm text-slate-600 capitalize">{order.channel_source}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            order.order_status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.order_status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {order.order_status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-900 text-right font-medium">
                          {order.order_total > 0 ? `${order.currency} ${order.order_total.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors inline-block" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
