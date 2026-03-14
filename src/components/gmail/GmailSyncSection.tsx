import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { GmailSyncLog } from '../../lib/supabase';

interface SyncResult {
  success: boolean;
  emails_found: number;
  emails_imported: number;
  emails_skipped: number;
  emails_failed: number;
  error?: string;
}

interface Props {
  syncing: boolean;
  lastResult: SyncResult | null;
  onSync: () => Promise<void>;
  logs: GmailSyncLog[];
  logsLoading: boolean;
  onRefreshLogs: () => void;
}

export function GmailSyncSection({ syncing, lastResult, onSync, logs, logsLoading, onRefreshLogs }: Props) {
  const handleSync = async () => {
    await onSync();
    onRefreshLogs();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Sync Controls</h3>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>

        {lastResult && !syncing && (
          <div className={`mt-4 p-4 rounded-lg ${lastResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              {lastResult.success
                ? <CheckCircle className="w-5 h-5 text-green-600" />
                : <XCircle className="w-5 h-5 text-red-600" />}
              <span className={`font-medium text-sm ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
                Sync {lastResult.success ? 'Complete' : 'Failed'}
              </span>
            </div>
            {lastResult.error ? (
              <p className="text-sm text-red-700">{lastResult.error}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-slate-600">Found: <span className="font-medium text-slate-900">{lastResult.emails_found}</span></div>
                <div className="text-green-700">Imported: <span className="font-medium">{lastResult.emails_imported}</span></div>
                <div className="text-slate-500">Skipped: <span className="font-medium text-slate-700">{lastResult.emails_skipped}</span></div>
                {lastResult.emails_failed > 0 && (
                  <div className="text-red-700">Failed: <span className="font-medium">{lastResult.emails_failed}</span></div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Recent Sync History</h3>
        </div>
        {logsLoading ? (
          <div className="p-6 text-center text-slate-500 text-sm">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">No sync history yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map(log => (
              <SyncLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SyncLogRow({ log }: { log: GmailSyncLog }) {
  const [expanded, setExpanded] = useState(false);

  const statusStyles: Record<string, string> = {
    running: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
  };

  const statusIcon: Record<string, React.ReactNode> = {
    running: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
    success: <CheckCircle className="w-3.5 h-3.5" />,
    partial: <AlertTriangle className="w-3.5 h-3.5" />,
    failed: <XCircle className="w-3.5 h-3.5" />,
  };

  const duration = log.completed_at && log.started_at
    ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
    : null;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${statusStyles[log.status] || 'bg-slate-100 text-slate-600'}`}>
            {statusIcon[log.status]}
            {log.status}
          </span>
          <span className="text-xs text-slate-500 capitalize">{log.sync_type}</span>
          <span className="text-sm text-slate-600">
            {new Date(log.started_at).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="text-green-600">{log.emails_imported} imported</span>
          {log.emails_failed > 0 && <span className="text-red-600">{log.emails_failed} failed</span>}
          {duration !== null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}s
            </span>
          )}
        </div>
      </button>
      {expanded && (log.error_message || log.error_details) && (
        <div className="px-6 pb-4">
          {log.error_message && (
            <p className="text-sm text-red-700 mb-2">{log.error_message}</p>
          )}
          {log.error_details && (
            <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs overflow-x-auto max-h-40 overflow-y-auto">
              {JSON.stringify(log.error_details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
