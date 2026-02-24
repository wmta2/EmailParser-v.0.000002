import { useState } from 'react';
import {
  Zap,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { cleanOrderwiseUrl } from '../../lib/urlUtils';

interface ConnectionSectionProps {
  baseUrl: string;
  setBaseUrl: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  sessionId: string;
  setSessionId: (v: string) => void;
  environment: 'sandbox' | 'live';
  setEnvironment: (v: 'sandbox' | 'live') => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  testing: boolean;
  testResult: { success: boolean; message: string } | null;
  onTest: () => void;
  hasUnsavedChanges: boolean;
}

export function ConnectionSection({
  baseUrl, setBaseUrl, username, setUsername, password, setPassword,
  sessionId, setSessionId, environment, setEnvironment, showPassword, setShowPassword,
  testing, testResult, onTest, hasUnsavedChanges,
}: ConnectionSectionProps) {
  const [showEnvWarning, setShowEnvWarning] = useState(false);

  const handleEnvironmentChange = (newEnv: 'sandbox' | 'live') => {
    if (newEnv === 'live' && environment === 'sandbox') {
      setShowEnvWarning(true);
    } else {
      setEnvironment(newEnv);
    }
  };

  const confirmLiveEnvironment = () => {
    setEnvironment('live');
    setShowEnvWarning(false);
  };

  const constructedUrl = baseUrl ? `${cleanOrderwiseUrl(baseUrl)}/${environment === 'live' ? 'OWAPI' : 'OWAPISB'}` : '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Connection</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Environment</label>
          <div className="flex gap-3">
            <button
              onClick={() => handleEnvironmentChange('sandbox')}
              disabled={hasUnsavedChanges}
              className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                environment === 'sandbox'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              } ${hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>🧪</span>
                <span>Sandbox</span>
              </div>
              <div className="text-xs mt-1 opacity-75">Testing environment (OWAPISB)</div>
            </button>
            <button
              onClick={() => handleEnvironmentChange('live')}
              disabled={hasUnsavedChanges}
              className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                environment === 'live'
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              } ${hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>🚀</span>
                <span>Live</span>
              </div>
              <div className="text-xs mt-1 opacity-75">Production environment (OWAPI)</div>
            </button>
          </div>
          {hasUnsavedChanges && (
            <p className="text-xs text-amber-600 mt-2">Save changes before switching environments</p>
          )}
        </div>

        {showEnvWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <h4 className="text-lg font-semibold text-slate-900">Switch to Live Environment?</h4>
              </div>
              <p className="text-slate-600 mb-6">
                You are about to switch to the <strong>Live (Production)</strong> environment. Any API calls will affect real data in your production Orderwise instance.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEnvWarning(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLiveEnvironment}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  Switch to Live
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Base Domain</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://yourinstance.orderwisecloud.com"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            Your Orderwise instance domain (without /OWAPI or /OWAPISB)
          </p>
          {constructedUrl && (
            <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200">
              <p className="text-xs text-slate-600">Full API URL:</p>
              <p className="text-xs font-mono text-slate-900 mt-0.5">{constructedUrl}</p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="API username"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="API password"
              className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm font-mono"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Your API credentials are used to obtain a Bearer token for authenticating with the Orderwise API
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">eCommerce Session ID</label>
          <input
            type="number"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="e.g. 1"
            className="w-32 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            The eCommerce Session ID configured in your Orderwise instance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onTest}
            disabled={testing || !baseUrl || !username || !password}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${testing ? 'animate-pulse' : ''}`} />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {hasUnsavedChanges && (
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">
              Testing unsaved changes
            </span>
          )}
          {!hasUnsavedChanges && testResult && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                Testing saved configuration
              </span>
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                environment === 'sandbox'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {environment === 'sandbox' ? '🧪 Sandbox' : '🚀 Live'}
              </span>
            </div>
          )}
        </div>
        {testResult && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {testResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p>{testResult.message}</p>
              <p className="text-xs mt-1 opacity-75">
                Tested in {environment === 'sandbox' ? 'Sandbox (OWAPISB)' : 'Live (OWAPI)'} environment
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
