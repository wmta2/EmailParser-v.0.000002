import { useState } from 'react';
import { Mail, CheckCircle, XCircle, AlertTriangle, LogOut, ExternalLink, RefreshCw } from 'lucide-react';
import type { GmailConnection } from '../../lib/supabase';
import { useGmailOAuth } from '../../hooks/useGmailSettings';

interface Props {
  connection: GmailConnection | null;
  loading: boolean;
  onConnected: () => void;
  onDisconnect: () => void;
}

export function GmailConnectionSection({ connection, loading, onConnected, onDisconnect }: Props) {
  const { connecting, error, getAuthUrl, handleCallback } = useGmailOAuth();
  const [oauthCode, setOauthCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleConnect = async () => {
    const url = await getAuthUrl();
    if (url) {
      window.open(url, '_blank', 'width=600,height=700');
      setShowCodeInput(true);
    }
  };

  const handleSubmitCode = async () => {
    if (!oauthCode.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    const success = await handleCallback(oauthCode.trim());
    setSubmitting(false);
    if (success) {
      setShowCodeInput(false);
      setOauthCode('');
      onConnected();
    } else {
      setSubmitError('Failed to connect. Please check the code and try again.');
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

      {isError && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Connection Error</p>
            <p className="text-sm text-red-700">{connection.error_message || 'An unknown error occurred'}</p>
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Connect a Gmail account to automatically import order emails. You will be redirected to Google to authorise access.
          </p>

          {!showCodeInput ? (
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
              {connecting ? 'Opening Google...' : 'Connect Gmail Account'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    After authorising in the Google window, copy the authorisation code from the redirect URL and paste it below.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Authorisation Code</label>
                <input
                  type="text"
                  value={oauthCode}
                  onChange={(e) => setOauthCode(e.target.value)}
                  placeholder="Paste the code from Google here"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm font-mono"
                />
              </div>
              {submitError && (
                <p className="text-sm text-red-600">{submitError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitCode}
                  disabled={submitting || !oauthCode.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Connecting...' : 'Connect'}
                </button>
                <button
                  onClick={() => { setShowCodeInput(false); setOauthCode(''); setSubmitError(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
