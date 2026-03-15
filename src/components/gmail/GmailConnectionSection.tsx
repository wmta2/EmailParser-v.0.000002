import { Mail, CheckCircle, XCircle, LogOut, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import type { GmailConnection } from '../../lib/supabase';
import { useGmailOAuth } from '../../hooks/useGmailSettings';

interface Props {
  connection: GmailConnection | null;
  loading: boolean;
  onConnected: () => void;
  onDisconnect: () => void;
}

export function GmailConnectionSection({ connection, loading, onConnected: _onConnected, onDisconnect }: Props) {
  const { connecting, error, getAuthUrl } = useGmailOAuth();

  const handleConnect = async () => {
    const url = await getAuthUrl();
    if (url) {
      window.location.href = url;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-slate-400 animate-pulse" />
          <h3 className="font-semibold text-slate-900">Gmail Connection</h3>
        </div>
        <div className="text-slate-500 text-sm">Loading connection status...</div>
      </div>
    );
  }

  const isConnected = connection?.connection_status === 'connected';
  const isNeedsReauth = connection?.connection_status === 'needs_reauth';
  const isError = connection?.connection_status === 'error';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Gmail Connection</h3>

      {isConnected && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">Connected</p>
              <p className="text-sm text-green-700 truncate">{connection.gmail_address}</p>
              {connection.last_synced_at && (
                <p className="text-xs text-green-600 mt-0.5">
                  Last synced: {new Date(connection.last_synced_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onDisconnect}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}

      {isNeedsReauth && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">Re-authorization Required</p>
              <p className="text-sm text-amber-700 truncate">{connection.gmail_address}</p>
              <p className="text-xs text-amber-600 mt-1">
                Gmail permissions have been upgraded. Please re-authorize to allow labelling and marking emails as read.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {connecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {connecting ? 'Redirecting to Google...' : 'Re-authorize with Google'}
            </button>
            <button
              onClick={onDisconnect}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {isError && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Connection Error</p>
            <p className="text-sm text-red-700">{connection.error_message || 'An unknown error occurred'}</p>
          </div>
        </div>
      )}

      {!isConnected && !isNeedsReauth && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Connect a Gmail account to automatically import order emails. You will be redirected to Google to authorise access.
          </p>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {connecting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            {connecting ? 'Redirecting to Google...' : 'Connect Gmail Account'}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
