import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, Users, Download } from 'lucide-react';
import { CustomerSyncItemsModal } from './CustomerSyncItemsModal';
import { CustomerSyncDetailModal } from './CustomerSyncDetailModal';
import type { CustomerSyncItem, CustomerSyncLog } from '../../hooks/useOrderwiseCustomerSync';

interface CustomerSyncSectionProps {
  syncing: boolean;
  progress: string;
  stats: { fetched: number; created: number; updated: number; skipped: number };
  onSync: () => void;
  message: string;
  hasCredentials: boolean;
  erpDestinationId: string | null;
  fetchSyncLogs: (erpDestinationId: string, limit?: number) => Promise<CustomerSyncLog[]>;
  fetchSyncItems: (syncLogId: string, actionFilter?: 'created' | 'updated' | 'skipped') => Promise<CustomerSyncItem[]>;
}

interface ItemsModalState {
  isOpen: boolean;
  syncLogId: string;
  actionFilter: 'created' | 'updated' | 'skipped';
  totalCount: number;
  syncDate: string;
}

export function CustomerSyncSection({
  syncing,
  progress,
  stats,
  onSync,
  message,
  hasCredentials,
  erpDestinationId,
  fetchSyncLogs,
  fetchSyncItems,
}: CustomerSyncSectionProps) {
  const [logs, setLogs] = useState<CustomerSyncLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [itemsModal, setItemsModal] = useState<ItemsModalState | null>(null);
  const [detailItem, setDetailItem] = useState<CustomerSyncItem | null>(null);

  useEffect(() => {
    if (erpDestinationId && showHistory) {
      fetchSyncLogs(erpDestinationId, 5).then(setLogs);
    }
  }, [erpDestinationId, showHistory, fetchSyncLogs]);

  const handleOpenItems = useCallback((
    syncLogId: string,
    actionFilter: 'created' | 'updated' | 'skipped',
    totalCount: number,
    syncDate: string
  ) => {
    if (totalCount > 0) {
      setItemsModal({ isOpen: true, syncLogId, actionFilter, totalCount, syncDate });
    }
  }, []);

  const handleViewDetail = useCallback((item: CustomerSyncItem) => {
    setDetailItem(item);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-900">Customer Sync</h3>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          History
        </button>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Sync customer data from Orderwise to keep local records up to date. Updates existing customers and creates new ones based on account numbers.
      </p>

      {syncing && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-blue-900">Syncing...</span>
          </div>
          <p className="text-xs text-blue-700">{progress}</p>
          {stats.fetched > 0 && (
            <div className="mt-2 flex gap-4 text-xs text-blue-700">
              <span>Fetched: {stats.fetched}</span>
              <span>Created: {stats.created}</span>
              <span>Updated: {stats.updated}</span>
              <span>Skipped: {stats.skipped}</span>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded-lg border ${
          message.includes('Success') || message.includes('success')
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-sm ${
            message.includes('Success') || message.includes('success')
              ? 'text-green-900'
              : 'text-red-900'
          }`}>
            {message}
          </p>
        </div>
      )}

      <button
        onClick={onSync}
        disabled={syncing || !hasCredentials}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        <Download className="w-4 h-4" />
        {syncing ? 'Syncing Customers...' : 'Sync Customers Now'}
      </button>

      {!hasCredentials && (
        <p className="text-xs text-amber-600 mt-2">
          Configure and save connection credentials first
        </p>
      )}

      <div className="mt-3 text-xs text-slate-500">
        <p>Automatic sync runs daily to fetch only modified customers.</p>
      </div>

      {showHistory && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Recent Sync History</h4>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">No sync history yet</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="text-xs p-2 bg-slate-50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 rounded font-medium ${
                      log.status === 'completed' ? 'bg-green-100 text-green-700' :
                      log.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {log.status}
                    </span>
                    <span className="text-slate-500">
                      {new Date(log.started_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-3 text-slate-600">
                    <span>Fetched: {log.customers_fetched}</span>
                    <button
                      onClick={() => handleOpenItems(log.id, 'created', log.customers_created, log.started_at)}
                      className={`${log.customers_created > 0 ? 'text-green-600 hover:underline cursor-pointer' : ''}`}
                      disabled={log.customers_created === 0}
                    >
                      Created: {log.customers_created}
                    </button>
                    <button
                      onClick={() => handleOpenItems(log.id, 'updated', log.customers_updated, log.started_at)}
                      className={`${log.customers_updated > 0 ? 'text-blue-600 hover:underline cursor-pointer' : ''}`}
                      disabled={log.customers_updated === 0}
                    >
                      Updated: {log.customers_updated}
                    </button>
                    {log.customers_skipped > 0 && (
                      <button
                        onClick={() => handleOpenItems(log.id, 'skipped', log.customers_skipped, log.started_at)}
                        className="text-amber-600 hover:underline cursor-pointer"
                      >
                        Skipped: {log.customers_skipped}
                      </button>
                    )}
                  </div>
                  {(log.addresses_fetched > 0 || log.addresses_created > 0 || log.addresses_updated > 0) && (
                    <div className="flex gap-3 text-slate-500 mt-0.5">
                      <span>Addr fetched: {log.addresses_fetched}</span>
                      <span className="text-green-600">Addr created: {log.addresses_created}</span>
                      <span className="text-blue-600">Addr updated: {log.addresses_updated}</span>
                      {log.addresses_skipped > 0 && (
                        <span className="text-amber-600">Addr skipped: {log.addresses_skipped}</span>
                      )}
                    </div>
                  )}
                  {log.error_message && (
                    <p className="mt-1 text-red-600">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {itemsModal && (
        <CustomerSyncItemsModal
          isOpen={itemsModal.isOpen}
          onClose={() => setItemsModal(null)}
          syncLogId={itemsModal.syncLogId}
          actionFilter={itemsModal.actionFilter}
          totalCount={itemsModal.totalCount}
          syncDate={itemsModal.syncDate}
          fetchSyncItems={fetchSyncItems}
          onViewDetail={handleViewDetail}
        />
      )}

      <CustomerSyncDetailModal
        isOpen={detailItem !== null}
        onClose={() => setDetailItem(null)}
        item={detailItem}
      />
    </div>
  );
}
