import { useState } from 'react';
import { useAllSyncLogs } from '../hooks/useChannels';
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Mail,
  ShoppingCart,
  Box,
  Package,
  FileText,
} from 'lucide-react';
import { SYNC_LOG_STATUS_CONFIG as STATUS_CONFIG } from '../lib/statusConfig';

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  Mail,
  ShoppingCart,
  Package,
  Box,
};

export function SyncLogsPage() {
  const { logs, loading, fetchLogs } = useAllSyncLogs(100);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLogs = statusFilter === 'all'
    ? logs
    : logs.filter(l => l.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pl-16 lg:pl-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Sync Logs</h2>
          <p className="text-slate-600 mt-1">Import history across all sales channels</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
            <option value="started">Started</option>
          </select>
          <span className="text-sm text-slate-500">{filteredLogs.length} entries</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading sync logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
          <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No sync logs found</h3>
          <p className="text-slate-600">Sync logs will appear here after importing orders</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-8 px-4 py-3"></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Channel</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Imported</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Skipped</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Failed</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map(log => {
                  const isExpanded = expandedId === log.id;
                  const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.started;
                  const StatusIcon = statusCfg.icon;
                  const ChannelIcon = CHANNEL_ICONS[(log as any).channel_icon] || Box;
                  const duration = log.completed_at && log.started_at
                    ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                    : null;

                  return (
                    <>
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          {log.error_details
                            ? (isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />)
                            : <span className="w-4 h-4 block" />
                          }
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600">
                          {new Date(log.started_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                            <ChannelIcon className="w-3.5 h-3.5" />
                            {log.channel_name}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600 capitalize">
                          {log.sync_type}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusCfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                          {log.orders_imported}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-500 text-right">
                          {log.orders_skipped}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-red-600 text-right font-medium">
                          {log.orders_failed}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-500 text-right">
                          {duration !== null ? `${duration}s` : '-'}
                        </td>
                      </tr>
                      {isExpanded && log.error_details && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={9} className="px-6 pb-4 pt-0">
                            <div className="ml-8">
                              {log.error_message && (
                                <p className="text-sm text-red-700 mb-2">{log.error_message}</p>
                              )}
                              <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs overflow-x-auto max-h-60 overflow-y-auto">
                                {JSON.stringify(log.error_details, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
