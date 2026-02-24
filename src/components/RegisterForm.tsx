import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserPlus, AlertCircle } from 'lucide-react';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const { signUp } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('token');
    if (inviteToken) {
      setToken(inviteToken);
      validateToken(inviteToken);
    } else {
      setValidatingToken(false);
    }
  }, []);

  const validateToken = async (inviteToken: string) => {
    setValidatingToken(true);
    const { data, error } = await supabase
      .from('invitations')
      .select('email, used, expires_at')
      .eq('token', inviteToken)
      .maybeSingle();

    if (error || !data) {
      setError('Invalid invitation token');
      setTokenValid(false);
    } else if (data.used) {
      setError('This invitation has already been used');
      setTokenValid(false);
    } else if (new Date(data.expires_at) < new Date()) {
      setError('This invitation has expired');
      setTokenValid(false);
    } else {
      setEmail(data.email);
      setTokenValid(true);
      setError('');
    }
    setValidatingToken(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!token) {
      setError('Invitation token is required');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, token);

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-slate-900 p-3 rounded-xl">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">
          Create Account
        </h1>
        <p className="text-center text-slate-600 mb-8">
          Register with your invitation
        </p>

        {validatingToken ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            <span className="ml-3 text-slate-600">Validating invitation...</span>
          </div>
        ) : !token ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">No invitation token provided</p>
              <p className="text-sm mt-1">Please use the invitation link sent to your email to register.</p>
            </div>
          </div>
        ) : !tokenValid ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-sm mt-1">Please contact an administrator for a new invitation.</p>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-slate-700 mb-2">
              Invitation Token
            </label>
            <input
              id="token"
              type="text"
              value={token}
              readOnly
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed font-mono text-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Email is set by the invitation and cannot be changed</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
