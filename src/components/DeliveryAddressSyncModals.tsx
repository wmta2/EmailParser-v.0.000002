import { useState, useEffect } from 'react';
import { X, MapPin, Phone, Mail, Hash, Clock, CheckCircle, RefreshCw as Refresh, AlertCircle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DeliveryAddressSyncLog, DeliveryAddressSyncItem } from '../lib/supabase';

interface SyncAddressListModalProps {
  syncLogId: string;
  actionFilter: 'created' | 'updated';
  onClose: () => void;
  onSelectAddress: (item: DeliveryAddressSyncItem) => void;
  fetchSyncItems: (syncLogId: string, action?: 'created' | 'updated' | 'skipped') => Promise<DeliveryAddressSyncItem[]>;
}

export function SyncAddressListModal({
  syncLogId,
  actionFilter,
  onClose,
  onSelectAddress,
  fetchSyncItems,
}: SyncAddressListModalProps) {
  const [items, setItems] = useState<DeliveryAddressSyncItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSyncItems(syncLogId, actionFilter).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, [syncLogId, actionFilter, fetchSyncItems]);

  const title = actionFilter === 'created' ? 'Created Addresses' : 'Updated Addresses';
  const icon = actionFilter === 'created' ? CheckCircle : Refresh;
  const IconComponent = icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-5 h-5 ${actionFilter === 'created' ? 'text-green-600' : 'text-blue-600'}`} />
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <span className="text-sm bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Refresh className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No {actionFilter} addresses found
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const snapshot = item.address_snapshot;
                const lines = [
                  snapshot.address1,
                  snapshot.address2,
                  snapshot.address3,
                  snapshot.town,
                  snapshot.county,
                  snapshot.postcode,
                ].filter(Boolean);

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectAddress(item)}
                    className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900 truncate">
                            {snapshot.name || 'Unnamed address'}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            #{item.external_id}
                          </span>
                        </div>
                        {lines.length > 0 && (
                          <p className="text-sm text-slate-600 truncate">
                            {lines.join(', ')}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AddressDetailModalProps {
  item: DeliveryAddressSyncItem;
  onClose: () => void;
  onBack?: () => void;
}

export function AddressDetailModal({ item, onClose, onBack }: AddressDetailModalProps) {
  const snapshot = item.address_snapshot;

  const addressLines = [
    snapshot.address1,
    snapshot.address2,
    snapshot.address3,
    snapshot.town,
    snapshot.county,
    snapshot.postcode,
    snapshot.country,
  ].filter(Boolean);

  const actionLabel = item.action === 'created' ? 'Created' : item.action === 'updated' ? 'Updated' : 'Skipped';
  const actionColor = item.action === 'created' ? 'text-green-600 bg-green-50' : item.action === 'updated' ? 'text-blue-600 bg-blue-50' : 'text-amber-600 bg-amber-50';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors mr-1"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
            )}
            <MapPin className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Address Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-lg">
              {snapshot.name || 'Unnamed address'}
            </h3>
            <span className={`text-xs font-medium px-2 py-1 rounded ${actionColor}`}>
              {actionLabel}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Hash className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-500 text-xs block">External ID</span>
                <span className="text-slate-900 font-mono">{item.external_id}</span>
              </div>
            </div>

            {snapshot.contact_name && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-500 text-xs block">Contact</span>
                  <span className="text-slate-900">{snapshot.contact_name}</span>
                </div>
              </div>
            )}

            {addressLines.length > 0 && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-500 text-xs block">Address</span>
                  <p className="text-slate-900 whitespace-pre-line leading-relaxed">
                    {addressLines.join('\n')}
                  </p>
                </div>
              </div>
            )}

            {snapshot.telephone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-500 text-xs block">Phone</span>
                  <span className="text-slate-900">{snapshot.telephone}</span>
                </div>
              </div>
            )}

            {snapshot.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-slate-500 text-xs block">Email</span>
                  <span className="text-slate-900">{snapshot.email}</span>
                </div>
              </div>
            )}

            {snapshot.is_default && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                  Default Address
                </span>
              </div>
            )}

            {item.error_message && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item.error_message}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SyncLogDetailModalProps {
  syncLog: DeliveryAddressSyncLog;
  onClose: () => void;
}

export function SyncLogDetailModal({ syncLog, onClose }: SyncLogDetailModalProps) {
  const statusColor = syncLog.status === 'completed'
    ? 'text-green-600 bg-green-50'
    : syncLog.status === 'failed'
    ? 'text-red-600 bg-red-50'
    : 'text-blue-600 bg-blue-50';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Sync Log Details</h2>
            <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor}`}>
              {syncLog.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <span className="text-slate-500 text-xs block mb-1">Fetched</span>
              <span className="text-xl font-semibold text-slate-900">{syncLog.addresses_fetched}</span>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <span className="text-green-600 text-xs block mb-1">Created</span>
              <span className="text-xl font-semibold text-green-700">{syncLog.addresses_created}</span>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <span className="text-blue-600 text-xs block mb-1">Updated</span>
              <span className="text-xl font-semibold text-blue-700">{syncLog.addresses_updated}</span>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <span className="text-amber-600 text-xs block mb-1">Skipped</span>
              <span className="text-xl font-semibold text-amber-700">{syncLog.addresses_skipped}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Started:</span>
              <span className="text-slate-900">{new Date(syncLog.started_at).toLocaleString()}</span>
            </div>
            {syncLog.completed_at && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Completed:</span>
                <span className="text-slate-900">{new Date(syncLog.completed_at).toLocaleString()}</span>
              </div>
            )}
            {syncLog.duration_ms != null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Duration:</span>
                <span className="text-slate-900">{syncLog.duration_ms}ms</span>
              </div>
            )}
          </div>

          {syncLog.endpoint && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Endpoint</h3>
              <div className="bg-slate-50 rounded-lg p-3 text-sm font-mono text-slate-800 break-all">
                <span className="text-blue-600 font-semibold mr-2">{syncLog.http_method || 'GET'}</span>
                {syncLog.endpoint}
              </div>
            </div>
          )}

          {syncLog.request_headers && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Request Headers</h3>
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
                {JSON.stringify(syncLog.request_headers, null, 2)}
              </pre>
            </div>
          )}

          {syncLog.response_body && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Response Body</h3>
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto max-h-64">
                {JSON.stringify(syncLog.response_body, null, 2)}
              </pre>
            </div>
          )}

          {syncLog.error_message && (
            <div>
              <h3 className="text-sm font-medium text-red-700 mb-2">Error</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{syncLog.error_message}</p>
                {syncLog.error_details && (
                  <pre className="mt-2 text-xs text-red-700 overflow-x-auto">
                    {JSON.stringify(syncLog.error_details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SyncHistoryPanelProps {
  customerId: string;
  onClose: () => void;
  onSelectLog: (log: DeliveryAddressSyncLog) => void;
  fetchSyncHistory: (customerId: string, page: number, pageSize: number) => Promise<{ logs: DeliveryAddressSyncLog[]; total: number }>;
}

export function SyncHistoryPanel({
  customerId,
  onClose,
  onSelectLog,
  fetchSyncHistory,
}: SyncHistoryPanelProps) {
  const [logs, setLogs] = useState<DeliveryAddressSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    fetchSyncHistory(customerId, page, pageSize).then(result => {
      setLogs(result.logs);
      setTotal(result.total);
      setLoading(false);
    });
  }, [customerId, page, fetchSyncHistory]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Sync History</h2>
            <span className="text-sm bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {total} total
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Refresh className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No sync history found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Fetched</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Duration</th>
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map(log => {
                  const statusColor = log.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : log.status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => onSelectLog(log)}
                    >
                      <td className="px-6 py-3 text-sm text-slate-900">
                        {new Date(log.started_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 text-right">{log.addresses_fetched}</td>
                      <td className="px-6 py-3 text-sm text-green-600 text-right font-medium">{log.addresses_created}</td>
                      <td className="px-6 py-3 text-sm text-blue-600 text-right font-medium">{log.addresses_updated}</td>
                      <td className="px-6 py-3 text-sm text-slate-500 text-right">
                        {log.duration_ms != null ? `${log.duration_ms}ms` : '-'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <ChevronRight className="w-4 h-4 text-slate-400 inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
