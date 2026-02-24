import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Mail, Calendar, Shield, CheckCircle, XCircle } from 'lucide-react';

export function ProfilePage() {
  const { profile, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setLoading(true);

    const { error } = await changePassword(newPassword);

    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } else {
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  return (
    <div className="space-y-6">
      <div className="pl-16 lg:pl-0">
        <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
        <p className="text-slate-600 mt-2">Manage your account information and security settings</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-slate-900" />
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">{profile?.email?.split('@')[0]}</h2>
              <p className="text-slate-300">{profile?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Mail className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Email Address</p>
                <p className="text-slate-900 font-semibold">{profile?.email}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Shield className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Role</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(profile?.role || 'user')}`}>
                  {getRoleLabel(profile?.role || 'user')}
                </span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Calendar className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Member Since</p>
                <p className="text-slate-900 font-semibold">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <User className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-sm text-slate-600 font-medium">Account ID</p>
                <p className="text-slate-900 font-mono text-xs">{profile?.id?.slice(0, 16)}...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Lock className="w-6 h-6 text-slate-900" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Change Password</h2>
            <p className="text-sm text-slate-600">Update your password to keep your account secure</p>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg border flex items-start space-x-3 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter new password"
              required
            />
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-600">Password Strength:</span>
                  <span className={`text-xs font-medium ${
                    passwordStrength.label === 'Weak' ? 'text-red-600' :
                    passwordStrength.label === 'Fair' ? 'text-yellow-600' :
                    passwordStrength.label === 'Good' ? 'text-blue-600' :
                    'text-green-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full bg-slate-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-slate-800 focus:ring-4 focus:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Password Requirements:</strong> Use at least 8 characters with a mix of uppercase, lowercase, numbers, and special characters for a strong password.
          </p>
        </div>
      </div>
    </div>
  );
}
