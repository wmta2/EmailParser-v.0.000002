import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEmails, type EmailSortColumn, type EmailSortDirection } from '../hooks/useEmails';
import { useCustomerMatch } from '../hooks/useCustomerMatch';
import { useOrderwiseExport } from '../hooks/useOrderwiseExport';
import { EmailDetailView } from './EmailDetailView';
import { ConfirmParseModal } from './ConfirmParseModal';
import { Pagination } from './Pagination';
import { SortableHeader, type SortDirection } from './SortableHeader';
import { supabase, type Customer } from '../lib/supabase';
import { parseEmail } from '../lib/emailParser';
import type { OrderExportPayload } from '../lib/erp/types';
import {
  Mail,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
  Upload,
  Loader,
  FileText,
} from 'lucide-react';

interface EmailStats {
  total: number;
  unparsed: number;
  pending: number;
  confirmed: number;
  exported: number;
  exportFailed: number;
  failed: number;
}

const PAGE_SIZE = 25;

const METHOD_LABELS: Record<string, string> = {
  supplier_code: 'Supplier Code',
  postcode: 'Postcode',
  manual: 'Manual',
};

export function EmailListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<EmailSortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<EmailSortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'unparsed' | 'failed' | 'exported' | 'export_failed'>('unparsed');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [emailStats, setEmailStats] = useState<EmailStats>({ total: 0, unparsed: 0, pending: 0, confirmed: 0, exported: 0, exportFailed: 0, failed: 0 });

  const [customerMap, setCustomerMap] = useState<Map<string, Customer>>(new Map());
  const [matchMap, setMatchMap] = useState<Map<number, { customer: Customer; method: string } | null>>(new Map());

  const [erpDestination, setErpDestination] = useState<any>(null);
  const [erpConfig, setErpConfig] = useState<any>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<number>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);

  const processedCustomerIds = useRef<Set<string>>(new Set());
  const processedEmailIds = useRef<Set<number>>(new Set());

  const erpConfigData = useMemo(() => erpConfig?.configuration || {}, [erpConfig]);
  const erpCredentials = useMemo(() => erpConfig?.credentials || {}, [erpConfig]);

  const { exportBatchOrders, progress, exporting } = useOrderwiseExport(
    erpDestination?.id || null,
    erpConfig?.id || null,
    erpConfigData,
    erpCredentials
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

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

        if (conf) setErpConfig(conf);
      }
    }
    fetchErpConfig();
  }, []);

  const fetchStats = useCallback(async () => {
    const [totalResult, ordersResult] = await Promise.all([
      supabase.from('raw_email').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('parsing_status, ow_export_status').eq('channel_source', 'email'),
    ]);

    const total = totalResult.count ?? 0;
    const orders = ordersResult.data ?? [];
    const exported = orders.filter(o => o.ow_export_status === 'exported').length;
    const exportFailed = orders.filter(o => o.ow_export_status === 'export_failed').length;
    const pending = orders.filter(o => o.parsing_status === 'pending' && !o.ow_export_status).length;
    const confirmed = orders.filter(o => o.parsing_status === 'confirmed' && !o.ow_export_status).length;
    const failed = orders.filter(o => o.parsing_status === 'failed').length;
    const parsed = orders.length;
    const unparsed = Math.max(0, total - parsed);

    setEmailStats({ total, unparsed, pending, confirmed, exported, exportFailed, failed });
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const { emails, totalCount, loading, error, bulkParseEmails, templateDetections, detectTemplatesForUnparsed } = useEmails({
    page: currentPage,
    pageSize: PAGE_SIZE,
    sortColumn,
    sortDirection,
    search: debouncedSearch,
    statusFilter,
  });

  const { findCustomerMatches } = useCustomerMatch();

  useEffect(() => {
    if (loading || emails.length === 0) return;
    detectTemplatesForUnparsed();

    async function loadCustomerData() {
      const parsedCustomerIds = emails
        .filter(e => e.order?.customer_id)
        .map(e => e.order!.customer_id as string);

      const newCustomerIds = [...new Set(parsedCustomerIds)].filter(id => !processedCustomerIds.current.has(id));
      if (newCustomerIds.length > 0) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .in('id', newCustomerIds);
        const fetched = data || [];
        fetched.forEach(c => processedCustomerIds.current.add(c.id));
        if (fetched.length > 0) {
          setCustomerMap(prev => {
            const next = new Map(prev);
            fetched.forEach(c => next.set(c.id, c));
            return next;
          });
        }
      }

      const unparsedEmails = emails.filter(e => !e.order && !processedEmailIds.current.has(e.id));
      if (unparsedEmails.length === 0) return;

      const unparsedIds = unparsedEmails.map(e => e.id);
      const { data: fullEmails } = await supabase
        .from('raw_email')
        .select('*')
        .in('id', unparsedIds);

      const fullEmailMap = new Map((fullEmails ?? []).map(e => [e.id, e]));

      const results = await Promise.all(
        unparsedEmails.map(async email => {
          const fullEmail = fullEmailMap.get(email.id);
          let supplierCode: string | null = null;
          let deliveryPostcode: string | null = null;
          let billingPostcode: string | null = null;
          let requester: string | null = null;
          let deliveryName: string | null = null;

          if (fullEmail) {
            try {
              const parsed = await parseEmail(fullEmail);
              if (parsed) {
                supplierCode = parsed.order.supplier_code ?? null;
                deliveryPostcode = parsed.order.delivery_postcode ?? null;
                billingPostcode = parsed.order.billing_postcode ?? null;
                requester = parsed.order.requester ?? null;
                deliveryName = parsed.order.delivery_name ?? null;
              }
            } catch {
            }
          }

          const result = await findCustomerMatches(
            supplierCode,
            deliveryPostcode,
            billingPostcode,
            requester,
            deliveryName
          );

          return {
            id: email.id,
            match: result.bestMatch
              ? { customer: result.bestMatch, method: result.matchMethod ?? 'manual' }
              : null,
          };
        })
      );

      const newEntries: Array<[number, { customer: Customer; method: string } | null]> = [];
      for (const { id, match } of results) {
        processedEmailIds.current.add(id);
        newEntries.push([id, match]);
      }

      if (newEntries.length > 0) {
        setMatchMap(prev => {
          const next = new Map(prev);
          newEntries.forEach(([id, val]) => next.set(id, val));
          return next;
        });
      }
    }

    loadCustomerData();
  }, [emails, loading]);

  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [parsing, setParsing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [parseResults, setParseResults] = useState<{ total: number; success: number; failed: number } | null>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const unparsedCount = emails.filter(e => !e.order).length;

  const selectableEmails = useMemo(() => {
    if (statusFilter === 'unparsed') {
      return emails.filter(e => !e.order);
    }
    if (statusFilter === 'confirmed') {
      return emails.filter(e => e.order?.parsing_status === 'confirmed' && !e.order?.ow_export_status);
    }
    if (statusFilter === 'export_failed') {
      return emails.filter(e => e.order?.ow_export_status === 'export_failed');
    }
    return [];
  }, [emails, statusFilter]);

  const allSelectableSelected = useMemo(() => {
    if (statusFilter === 'unparsed') {
      return selectableEmails.length > 0 && selectableEmails.every(e => selectedEmailIds.has(e.id));
    }
    return selectableEmails.length > 0 && selectableEmails.every(e => selectedOrderIds.has(e.order!.id));
  }, [statusFilter, selectableEmails, selectedEmailIds, selectedOrderIds]);

  const showCheckboxes = statusFilter === 'confirmed' || statusFilter === 'export_failed' || statusFilter === 'unparsed';
  const showExportButton = (statusFilter === 'confirmed' || statusFilter === 'export_failed') && selectedOrderIds.size > 0;

  function handleSort(key: string) {
    const col = key as EmailSortColumn;
    if (col === sortColumn) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }

  function handleBulkParse() {
    setShowConfirmModal(true);
  }

  async function confirmBulkParse() {
    setShowConfirmModal(false);
    setParsing(true);
    const emailIdsToProcess = selectedEmailIds.size > 0 ? Array.from(selectedEmailIds) : undefined;
    const results = await bulkParseEmails(emailIdsToProcess);
    setParseResults(results);
    setShowResultModal(true);
    setParsing(false);
    setSelectedEmailIds(new Set());
    await fetchStats();
  }

  function handleToggleOrder(orderId: string) {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }

  function handleToggleEmail(emailId: number) {
    setSelectedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (statusFilter === 'unparsed') {
      if (allSelectableSelected) {
        setSelectedEmailIds(new Set());
      } else {
        const ids = new Set<number>();
        selectableEmails.forEach(e => ids.add(e.id));
        setSelectedEmailIds(ids);
      }
    } else {
      if (allSelectableSelected) {
        setSelectedOrderIds(new Set());
      } else {
        const ids = new Set<string>();
        selectableEmails.forEach(e => ids.add(e.order!.id));
        setSelectedOrderIds(ids);
      }
    }
  }

  function handleStatusCardClick(filter: typeof statusFilter) {
    if (statusFilter === filter) {
      setStatusFilter('all');
    } else {
      setStatusFilter(filter);
    }
    setSelectedOrderIds(new Set());
    setSelectedEmailIds(new Set());
  }

  async function handleBulkExport() {
    if (!erpConfig || !erpDestination) {
      alert('ERP is not configured. Please configure Orderwise settings first.');
      return;
    }
    if (selectedOrderIds.size === 0) {
      alert('Please select at least one order to export.');
      return;
    }

    setShowExportModal(true);

    const selectedEmails = emails.filter(e => e.order && selectedOrderIds.has(e.order.id));
    const payloads: OrderExportPayload[] = [];

    for (const email of selectedEmails) {
      const order = email.order!;

      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      let customer = undefined;
      if (order.customer_id) {
        const { data: c } = await supabase
          .from('customers')
          .select('*')
          .eq('id', order.customer_id)
          .maybeSingle();
        customer = c || undefined;
      }

      payloads.push({ order, items: items || [], customer });
    }

    try {
      await exportBatchOrders(payloads);
      setSelectedOrderIds(new Set());
      await fetchStats();
    } catch (err) {
      console.error('Bulk export error:', err);
      alert('An error occurred during bulk export. Please check the logs.');
    }
  }

  function getFromCell(email: typeof emails[0]) {
    if (!email.order) {
      const match = matchMap.get(email.id);
      if (match === undefined) {
        return (
          <div className="max-w-[200px]">
            <div className="text-slate-400 text-xs truncate">{email.from_email || '-'}</div>
          </div>
        );
      }
      if (match === null) {
        return (
          <div className="max-w-[200px] truncate text-slate-500" title={email.from_email || ''}>
            {email.from_email || '-'}
          </div>
        );
      }
      return (
        <div className="max-w-[200px]" title={email.from_email || ''}>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-900 truncate">{match.customer.name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500 font-medium">
              {METHOD_LABELS[match.method] ?? match.method}
            </span>
            {match.customer.account_number && (
              <span className="text-xs text-slate-400 font-mono truncate">{match.customer.account_number}</span>
            )}
          </div>
        </div>
      );
    }

    const customerId = email.order.customer_id;
    if (!customerId) {
      return (
        <div className="max-w-[200px] truncate text-slate-500" title={email.from_email || ''}>
          {email.from_email || '-'}
        </div>
      );
    }

    const customer = customerMap.get(customerId);
    if (!customer) {
      return (
        <div className="max-w-[200px] truncate text-slate-500" title={email.from_email || ''}>
          {email.from_email || '-'}
        </div>
      );
    }

    return (
      <div className="max-w-[200px]" title={email.from_email || ''}>
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-900 truncate">{customer.name}</span>
        </div>
        {customer.account_number && (
          <div className="text-xs text-slate-400 font-mono mt-0.5 pl-5 truncate">{customer.account_number}</div>
        )}
      </div>
    );
  }

  function getStatusBadge(email: typeof emails[0]) {
    if (!email.order) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
          <Clock className="w-3.5 h-3.5" />
          Unparsed
        </span>
      );
    }

    if (email.order.ow_export_status === 'exported') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
          <CheckCircle className="w-3.5 h-3.5" />
          Exported
        </span>
      );
    }

    if (email.order.ow_export_status === 'export_failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700">
          <XCircle className="w-3.5 h-3.5" />
          Export Failed
        </span>
      );
    }

    if (email.order.parsing_status === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3.5 h-3.5" />
          OW Ready
        </span>
      );
    }

    if (email.order.parsing_status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
          <Clock className="w-3.5 h-3.5" />
          Pending Review
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="w-3.5 h-3.5" />
        Failed
      </span>
    );
  }

  if (selectedEmailId) {
    return (
      <EmailDetailView
        emailId={selectedEmailId}
        onClose={() => setSelectedEmailId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pl-16 lg:pl-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Email Orders</h2>
          <p className="text-slate-600 mt-1">Orders received and parsed from email</p>
        </div>
        <div className="flex items-center gap-3">
          {showExportButton && (
            <>
              <span className="text-sm text-slate-600">{selectedOrderIds.size} selected</span>
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
          {statusFilter === 'unparsed' && selectedEmailIds.size > 0 && (
            <>
              <span className="text-sm text-slate-600">{selectedEmailIds.size} selected</span>
              <button
                onClick={() => setSelectedEmailIds(new Set())}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Clear
              </button>
              <button
                onClick={handleBulkParse}
                disabled={parsing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${parsing ? 'animate-spin' : ''}`} />
                <span>Parse Selected ({selectedEmailIds.size})</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => handleStatusCardClick('all')}
          className={`bg-white rounded-xl shadow-sm p-4 border-2 transition-all text-left ${
            statusFilter === 'all' ? 'border-slate-600 ring-2 ring-slate-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">All</p>
              <p className="text-2xl font-bold text-slate-600">{emailStats.total}</p>
            </div>
            <Mail className="w-8 h-8 text-slate-300" />
          </div>
        </button>
        <button
          onClick={() => handleStatusCardClick('unparsed')}
          className={`bg-white rounded-xl shadow-sm p-4 border-2 transition-all text-left ${
            statusFilter === 'unparsed' ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Unparsed</p>
              <p className="text-2xl font-bold text-slate-700">{emailStats.unparsed}</p>
            </div>
            <Clock className="w-8 h-8 text-slate-300" />
          </div>
        </button>
        <button
          onClick={() => handleStatusCardClick('confirmed')}
          className={`bg-white rounded-xl shadow-sm p-4 border-2 transition-all text-left ${
            statusFilter === 'confirmed' ? 'border-green-600 ring-2 ring-green-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">OW Ready</p>
              <p className="text-2xl font-bold text-green-600">{emailStats.confirmed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
        </button>
        <button
          onClick={() => handleStatusCardClick('exported')}
          className={`bg-white rounded-xl shadow-sm p-4 border-2 transition-all text-left ${
            statusFilter === 'exported' ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Exported</p>
              <p className="text-2xl font-bold text-blue-600">{emailStats.exported}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-200" />
          </div>
        </button>
        <button
          onClick={() => handleStatusCardClick('export_failed')}
          className={`bg-white rounded-xl shadow-sm p-4 border-2 transition-all text-left ${
            statusFilter === 'export_failed' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Export Failed</p>
              <p className="text-2xl font-bold text-red-500">{emailStats.exportFailed}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-200" />
          </div>
        </button>
      </div>

      <div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject, sender..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading emails...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-800">{error}</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
          <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No emails found</h3>
          <p className="text-slate-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No emails have been imported yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {showCheckboxes && (
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        onChange={handleSelectAll}
                        disabled={selectableEmails.length === 0}
                        title={
                          statusFilter === 'unparsed'
                            ? 'Select all unparsed emails'
                            : statusFilter === 'confirmed'
                            ? 'Select all OW Ready orders'
                            : 'Select all failed orders'
                        }
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 disabled:opacity-50"
                      />
                    </th>
                  )}
                  <SortableHeader label="Date" sortKey="created_at" activeSortKey={sortColumn} direction={sortDirection as SortDirection} onSort={handleSort} />
                  {statusFilter !== 'unparsed' && (
                    <SortableHeader label="Order #" sortKey="order_number" activeSortKey={sortColumn} direction={sortDirection as SortDirection} onSort={handleSort} />
                  )}
                  <SortableHeader label="Platform" sortKey="platform" activeSortKey={sortColumn} direction={sortDirection as SortDirection} onSort={handleSort} />
                  <SortableHeader label="From" sortKey="from_email" activeSortKey={sortColumn} direction={sortDirection as SortDirection} onSort={handleSort} />
                  <SortableHeader label="Subject" sortKey="subject" activeSortKey={sortColumn} direction={sortDirection as SortDirection} onSort={handleSort} />
                  {statusFilter === 'all' && (
                    <SortableHeader label="Status" sortKey="status" activeSortKey={sortColumn} direction={sortDirection as SortDirection} onSort={handleSort} />
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {emails.map((email) => {
                  const orderId = email.order?.id;
                  const isUnparsed = !email.order;
                  const isEmailSelected = selectedEmailIds.has(email.id);
                  const isOrderSelected = orderId ? selectedOrderIds.has(orderId) : false;
                  const isSelected = statusFilter === 'unparsed' ? isEmailSelected : isOrderSelected;
                  const isSelectable = showCheckboxes && (
                    (statusFilter === 'unparsed' && isUnparsed) ||
                    (statusFilter === 'confirmed' && orderId && email.order?.parsing_status === 'confirmed' && !email.order?.ow_export_status) ||
                    (statusFilter === 'export_failed' && orderId && email.order?.ow_export_status === 'export_failed')
                  );

                  return (
                    <tr
                      key={email.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedEmailId(email.id)}
                    >
                      {showCheckboxes && (
                        <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                          {isSelectable ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (statusFilter === 'unparsed') {
                                  handleToggleEmail(email.id);
                                } else if (orderId) {
                                  handleToggleOrder(orderId);
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                            />
                          ) : (
                            <span className="w-4 h-4 block" />
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {new Date(email.created_at).toLocaleDateString()}
                      </td>
                      {statusFilter !== 'unparsed' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                          {email.order?.order_number || '-'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {email.platform || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {getFromCell(email)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        <div className="max-w-xs truncate">{email.subject || 'No Subject'}</div>
                      </td>
                      {statusFilter === 'all' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(email)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      )}

      {showConfirmModal && (
        <ConfirmParseModal
          emails={emails}
          templateDetections={templateDetections}
          onConfirm={confirmBulkParse}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {showResultModal && parseResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Parse Complete</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Total Processed:</span>
                <span className="font-bold text-slate-900">{parseResults.total}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-green-700">Successful:</span>
                <span className="font-bold text-green-700">{parseResults.success}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-red-700">Failed:</span>
                <span className="font-bold text-red-700">{parseResults.failed}</span>
              </div>
            </div>
            <button
              onClick={() => setShowResultModal(false)}
              className="mt-6 w-full px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showExportModal && progress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Exporting Orders to Orderwise</h3>
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
                    }}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
