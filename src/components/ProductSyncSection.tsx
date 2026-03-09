import { useState } from 'react';
import { useProductSync } from '../hooks/useProductSync';
import { RefreshCw, CheckCircle, XCircle, Clock, Package } from 'lucide-react';

interface ProductSyncSectionProps {
  erpDestinationId: string;
}

export function ProductSyncSection({ erpDestinationId }: ProductSyncSectionProps) {
  const { syncLogs, loading, syncing, error, triggerSync, refetch } = useProductSync(erpDestinationId);
  const [syncSuccess, setSyncSuccess] = useState(false);

  async function handleSync() {
    try {
      setSyncSuccess(false);
      await triggerSync();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 5000);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }

  const latestSync = syncLogs[0];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-slate-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Product Sync</h3>
            <p className="text-sm text-slate-600">Sync products and prices from Orderwise</p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {syncSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle className="w-4 h-4" />
          Product sync completed successfully
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {latestSync && (
        <div className="space-y-4">
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Latest Sync</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">
                  {latestSync.products_fetched}
                </div>
                <div className="text-xs text-blue-700 mt-1">Fetched</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {latestSync.products_created}
                </div>
                <div className="text-xs text-green-700 mt-1">Created</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-amber-600">
                  {latestSync.products_updated}
                </div>
                <div className="text-xs text-amber-700 mt-1">Updated</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-slate-600">
                  {latestSync.products_skipped}
                </div>
                <div className="text-xs text-slate-700 mt-1">Skipped</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {new Date(latestSync.started_at).toLocaleString()}
              {latestSync.status === 'completed' && latestSync.completed_at && (
                <span>
                  ({Math.round((new Date(latestSync.completed_at).getTime() - new Date(latestSync.started_at).getTime()) / 1000)}s)
                </span>
              )}
            </div>
          </div>

          {syncLogs.length > 1 && (
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Sync History</h4>
              <div className="space-y-2">
                {syncLogs.slice(1, 6).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {log.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : log.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                      <span className="text-slate-700">
                        {new Date(log.started_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {log.products_fetched} products
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && syncLogs.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No sync history yet</p>
          <p className="text-xs mt-1">Click "Sync Now" to start syncing products</p>
        </div>
      )}
    </div>
  );
}
