import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { GmailSyncLog } from '../../lib/supabase';

interface SyncResult {
  success: boolean;
  emails_found: number;
  emails_imported: number;
  emails_skipped: number;
  emails_failed: number;
  search_after?: string;
  checkpoint_source?: string;
  debug?: string[];
  error?: string;
}

interface Props {
  syncing: boolean;
  lastResult: SyncResult | null;
  onSync: () => Promise<void>;
  onSyncWithReset: () => Promise<void>;
  logs: GmailSyncLog[];
  logsLoading: boolean;
  onRefreshLogs: () => void;
}

export function GmailSyncSection({ syncing, lastResult, onSync, onSyncWithReset, logs, logsLoading, onRefreshLogs }: Props) {
  const [showDebug, setShowDebug] = useState(false);

  const handleSync = async () => {
    setShowDebug(false);
    await onSync();
    onRefreshLogs();
  };

  const handleSyncWithReset = async () => {
    setShowDebug(false);
    await onSyncWithReset();
    onRefreshLogs();
  };

  const hasDebug = lastResult?.debug && lastResult.debug.length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Sync Controls</h3>
        <div className="space-y-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={handleSyncWithReset}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Sync from Start Date (reset checkpoint)
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          "Sync Now" only fetches emails newer than the last sync. "Sync from Start Date" ignores the checkpoint and re-fetches from your configured start date.
        </p>

        {lastResult && !syncing && (
          <div className={`mt-4 p-4 rounded-lg ${lastResult.success ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
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
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-600">Found: <span className="font-medium text-slate-900">{lastResult.emails_found}</span></div>
                  <div className="text-green-700">Imported: <span className="font-medium">{lastResult.emails_imported}</span></div>
                  <div className="text-slate-500">Skipped: <span className="font-medium text-slate-700">{lastResult.emails_skipped}</span></div>
                  {lastResult.emails_failed > 0 && (
                    <div className="text-red-700">Failed: <span className="font-medium">{lastResult.emails_failed}</span></div>
                  )}
                </div>
                {lastResult.search_after && (
                  <div className="mt-2 pt-2 border-t border-green-200 text-xs text-slate-500">
                    Searched from: <span className="font-mono text-slate-700">{new Date(lastResult.search_after).toLocaleString()}</span>
                    {lastResult.checkpoint_source && (
                      <span className="ml-1 text-slate-400">({lastResult.checkpoint_source.split(' (')[0]})</span>
                    )}
                  </div>
                )}
                {hasDebug && (
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showDebug ? 'Hide' : 'Show'} debug log
                  </button>
                )}
                {showDebug && hasDebug && (
                  <div className="mt-2 bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {lastResult.debug!.map((line, i) => (
                      <div key={i} className={`text-xs font-mono leading-relaxed ${
                        line.includes('IMPORTED') ? 'text-green-400' :
                        line.includes('SKIPPED') ? 'text-amber-400' :
                        line.includes('FAILED') || line.includes('ERROR') ? 'text-red-400' :
                        line.includes('MATCHED') ? 'text-blue-400' :
                        'text-slate-300'
                      }`}>
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </>
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

  const debugLines: string[] | null = log.error_details?.debug ?? null;
  const hasDetails = !!(log.error_message || log.error_details);

  return (
    <div>
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full px-6 py-3 flex items-center justify-between transition-colors text-left ${hasDetails ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}
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
          <span className="text-slate-500">{log.emails_found} found</span>
          <span className="text-green-600">{log.emails_imported} imported</span>
          {log.emails_skipped > 0 && <span className="text-amber-600">{log.emails_skipped} skipped</span>}
          {log.emails_failed > 0 && <span className="text-red-600">{log.emails_failed} failed</span>}
          {duration !== null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}s
            </span>
          )}
          {hasDetails && (
            expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-6 pb-4 space-y-2">
          {log.error_message && (
            <p className="text-sm text-red-700">{log.error_message}</p>
          )}
          {debugLines && debugLines.length > 0 && (
            <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto">
              {debugLines.map((line, i) => (
                <div key={i} className={`text-xs font-mono leading-relaxed ${
                  line.includes('IMPORTED') ? 'text-green-400' :
                  line.includes('SKIPPED') ? 'text-amber-400' :
                  line.includes('FAILED') || line.includes('ERROR') ? 'text-red-400' :
                  line.includes('MATCHED') ? 'text-blue-400' :
                  'text-slate-300'
                }`}>
                  {line}
                </div>
              ))}
            </div>
          )}
          {log.error_details?.errors && log.error_details.errors.length > 0 && (
            <div className="space-y-1">
              {log.error_details.errors.map((e: string, i: number) => (
                <p key={i} className="text-xs text-red-600 font-mono">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
