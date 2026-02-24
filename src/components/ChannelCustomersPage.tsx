import { useState, useMemo } from 'react';
import { useChannelCustomers, useChannelCustomerDetail, type ChannelCustomerWithStats } from '../hooks/useChannelCustomers';
import { EmailDetailView } from './EmailDetailView';
import { WooCommerceOrderDetailView } from './WooCommerceOrderDetailView';
import { Pagination } from './Pagination';
import { SortableHeader, type SortDirection } from './SortableHeader';
import { type Order } from '../lib/supabase';
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
  XCircle,
  ExternalLink,
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

function getSortValue(customer: ChannelCustomerWithStats, key: string): unknown {
  switch (key) {
    case 'name': return customer.name || '';
    case 'email': return customer.email || '';
    case 'company': return customer.company || '';
    case 'channel_name': return customer.channel_name || '';
    case 'order_count': return customer.order_count;
    case 'last_order_date': return customer.last_order_date || '';
    default: return '';
  }
}

export function ChannelCustomersPage() {
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
  } = useChannelCustomers();
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
      compareValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDirection)
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
      <ChannelCustomerDetailPanel
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pl-16 lg:pl-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Channel Customers</h2>
          <p className="text-slate-600 mt-1">Customers synced from sales channels</p>
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
              <option value="all">All Channels</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading channel customers...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-800">{error}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No channel customers found</h3>
          <p className="text-slate-600">
            {search || channelFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Channel customers will appear here after syncing orders from your sales channels'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <SortableHeader label="Name" sortKey="name" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Email" sortKey="email" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Company" sortKey="company" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Channel" sortKey="channel_name" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
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
                      <td className="px-6 py-4 text-sm text-slate-600">{cust.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cust.company || '-'}</td>
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

function ChannelCustomerDetailPanel({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { customer, orders, loading } = useChannelCustomerDetail(customerId);
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

  const shippingAddress = [
    customer.shipping_name,
    customer.shipping_address1,
    customer.shipping_address2,
    customer.shipping_address3,
    customer.shipping_town,
    customer.shipping_county,
    customer.shipping_postcode,
    customer.shipping_country,
  ].filter(Boolean).join('\n');

  const billingAddress = [
    customer.billing_name,
    customer.billing_address1,
    customer.billing_address2,
    customer.billing_address3,
    customer.billing_town,
    customer.billing_county,
    customer.billing_postcode,
    customer.billing_country,
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pl-16 lg:pl-0">
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>
          <p className="text-sm text-slate-500 mt-1">Channel customer details and order history</p>
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
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-900">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-900">{customer.phone}</span>
                </div>
              )}
              {customer.company && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-900">{customer.company}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 text-xs font-medium uppercase">External ID</span>
                <p className="text-slate-700 font-mono text-xs mt-1">{customer.external_id}</p>
              </div>
            </div>
          </div>

          {(shippingAddress || billingAddress) && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Addresses</h3>
              </div>
              <div className="space-y-4 text-sm">
                {shippingAddress && (
                  <div>
                    <span className="text-slate-500 text-xs font-medium uppercase">Shipping</span>
                    <p className="text-slate-900 whitespace-pre-line mt-1">{shippingAddress}</p>
                  </div>
                )}
                {billingAddress && (
                  <div>
                    <span className="text-slate-500 text-xs font-medium uppercase">Billing</span>
                    <p className="text-slate-900 whitespace-pre-line mt-1">{billingAddress}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
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
