import { useState, useEffect } from 'react';
import { useOrderwiseApiLogs, type ApiLog } from '../hooks/useOrderwiseApiLogs';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Copy,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Pagination } from './Pagination';

interface Props {
  onBack?: () => void;
}

export function OrderwiseApiLogsPage({ onBack }: Props) {
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    supabase
      .from('erp_destinations')
      .select('id')
      .eq('slug', 'orderwise')
      .maybeSingle()
      .then(({ data }) => setDestinationId(data?.id || null));
  }, []);

  const {
    logs,
    loading,
    stats,
    loadingStats,
    totalCount,
    page,
    setPage,
    filters,
    setFilters,
    fetchLogs,
    fetchStats,
    clearOldLogs,
  } = useOrderwiseApiLogs(destinationId, 20);

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      await clearOldLogs(30);
      setShowCleanupModal(false);
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setCleaning(false);
    }
  };

  if (!destinationId) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pl-16 lg:pl-0">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <FileText className="w-7 h-7 text-slate-700" />
            <h2 className="text-3xl font-bold text-slate-900">Orderwise API Logs</h2>
          </div>
          <p className="text-slate-600 mt-1">View detailed logs of all API interactions with Orderwise</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchLogs();
              fetchStats();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCleanupModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clean Up
          </button>
        </div>
      </div>

      {!loadingStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            label="Calls (24h)"
            value={stats.total24h.toString()}
            icon={<Clock className="w-5 h-5 text-blue-600" />}
          />
          <StatsCard
            label="Success Rate"
            value={`${stats.successRate}%`}
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          />
          <StatsCard
            label="Avg Duration"
            value={`${stats.avgDuration}ms`}
            icon={<Clock className="w-5 h-5 text-slate-600" />}
          />
          <StatsCard
            label="Recent Errors"
            value={stats.mostRecentError ? '1' : '0'}
            icon={<AlertCircle className={`w-5 h-5 ${stats.mostRecentError ? 'text-red-600' : 'text-slate-400'}`} />}
            subtitle={stats.mostRecentError || undefined}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filters.requestType}
            onChange={(e) => setFilters({ ...filters, requestType: e.target.value as any })}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">All Request Types</option>
            <option value="authentication">Authentication</option>
            <option value="api_request">API Request</option>
          </select>

          <select
            value={filters.success}
            onChange={(e) => setFilters({ ...filters, success: e.target.value as any })}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          <input
            type="text"
            placeholder="Search endpoint..."
            value={filters.searchEndpoint || ''}
            onChange={(e) => setFilters({ ...filters, searchEndpoint: e.target.value })}
            className="flex-1 min-w-[200px] px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>

        <div className="text-sm text-slate-600 mb-4">
          Showing {logs.length} of {totalCount} logs
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No API logs found</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-200">
              {logs.map(log => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {showCleanupModal && (
        <CleanupModal
          onConfirm={handleCleanup}
          onCancel={() => setShowCleanupModal(false)}
          cleaning={cleaning}
        />
      )}
    </div>
  );
}

function StatsCard({
  label,
  value,
  icon,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1 truncate" title={subtitle}>{subtitle}</div>}
    </div>
  );
}

function LogRow({ log }: { log: ApiLog }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const statusColor = log.success
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700';

  const httpStatusColor = !log.response_status
    ? 'text-slate-500'
    : log.response_status < 300
    ? 'text-green-600'
    : log.response_status < 400
    ? 'text-yellow-600'
    : log.response_status < 500
    ? 'text-orange-600'
    : 'text-red-600';

  return (
    <div className="py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between hover:bg-slate-50 px-2 py-2 rounded transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor}`}>
            {log.request_type === 'authentication' ? 'Auth' : 'API'}
          </span>
          <span className="text-xs text-slate-500">
            {new Date(log.created_at).toLocaleString()}
          </span>
          <span className="text-xs font-medium text-slate-700">
            {log.http_method}
          </span>
          <span className="text-xs text-slate-600 truncate flex-1">
            {log.endpoint}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {log.response_status && (
            <span className={`text-xs font-medium ${httpStatusColor}`}>
              {log.response_status}
            </span>
          )}
          {log.duration_ms !== null && (
            <span className="text-xs text-slate-500">{log.duration_ms}ms</span>
          )}
          {log.success ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4 px-2">
          {log.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700 mt-1">{log.error_message}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(log.error_message!, 'error')}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Copy error message"
                >
                  {copied === 'error' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-red-600" />
                  )}
                </button>
              </div>
            </div>
          )}

          <DetailSection
            title="Request Headers"
            data={log.request_headers}
            onCopy={() => copyToClipboard(JSON.stringify(log.request_headers, null, 2), 'req-headers')}
            copied={copied === 'req-headers'}
          />

          {log.request_body && (
            <DetailSection
              title="Request Body"
              data={log.request_body}
              onCopy={() => copyToClipboard(JSON.stringify(log.request_body, null, 2), 'req-body')}
              copied={copied === 'req-body'}
            />
          )}

          <DetailSection
            title="Response Headers"
            data={log.response_headers}
            onCopy={() => copyToClipboard(JSON.stringify(log.response_headers, null, 2), 'res-headers')}
            copied={copied === 'res-headers'}
          />

          {log.response_body && (
            <DetailSection
              title="Response Body"
              data={log.response_body}
              onCopy={() => copyToClipboard(JSON.stringify(log.response_body, null, 2), 'res-body')}
              copied={copied === 'res-body'}
            />
          )}

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <DetailSection
              title="Metadata"
              data={log.metadata}
              onCopy={() => copyToClipboard(JSON.stringify(log.metadata, null, 2), 'metadata')}
              copied={copied === 'metadata'}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DetailSection({
  title,
  data,
  onCopy,
  copied,
}: {
  title: string;
  data: unknown;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span className="text-green-600">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs overflow-x-auto max-h-60 overflow-y-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function CleanupModal({
  onConfirm,
  onCancel,
  cleaning,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  cleaning: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-full">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Clean Up Old Logs
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              This will permanently delete all API logs older than 30 days. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                disabled={cleaning}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={cleaning}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cleaning ? 'Cleaning...' : 'Delete Old Logs'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
