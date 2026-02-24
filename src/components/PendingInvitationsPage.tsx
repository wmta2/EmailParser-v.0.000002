import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Invitation } from '../lib/supabase';
import { Mail, Copy, CheckCircle, XCircle, Clock, UserPlus } from 'lucide-react';

export function PendingInvitationsPage() {
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [filteredInvitations, setFilteredInvitations] = useState<Invitation[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  useEffect(() => {
    filterInvitations();
  }, [invitations, statusFilter]);

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvitations(data);
    }
  };

  const filterInvitations = () => {
    let filtered = invitations;

    if (statusFilter === 'active') {
      filtered = filtered.filter(inv => !inv.used && !isExpired(inv.expires_at));
    } else if (statusFilter === 'used') {
      filtered = filtered.filter(inv => inv.used);
    } else if (statusFilter === 'expired') {
      filtered = filtered.filter(inv => !inv.used && isExpired(inv.expires_at));
    }

    setFilteredInvitations(filtered);
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: newEmail,
          role: newRole,
          invited_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess(`Invitation created for ${newEmail}`);
      setNewEmail('');
      setNewRole('user');
      fetchInvitations();

      if (data) {
        const inviteUrl = `${window.location.origin}/register?token=${data.token}`;
        await navigator.clipboard.writeText(inviteUrl);
        setCopiedToken(data.token);
        setTimeout(() => setCopiedToken(null), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/register?token=${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const stats = {
    total: invitations.length,
    active: invitations.filter(inv => !inv.used && !isExpired(inv.expires_at)).length,
    used: invitations.filter(inv => inv.used).length,
    expired: invitations.filter(inv => !inv.used && isExpired(inv.expires_at)).length,
  };

  return (
    <div className="space-y-6">
      <div className="pl-16 lg:pl-0">
        <h2 className="text-3xl font-bold text-slate-900">Pending Invitations</h2>
        <p className="text-slate-600 mt-1">Create and manage user invitations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Invitations</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <Mail className="opacity-20" size={48} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active</p>
              <p className="text-3xl font-bold mt-1">{stats.active}</p>
            </div>
            <CheckCircle className="opacity-20" size={48} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Used</p>
              <p className="text-3xl font-bold mt-1">{stats.used}</p>
            </div>
            <UserPlus className="opacity-20" size={48} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Expired</p>
              <p className="text-3xl font-bold mt-1">{stats.expired}</p>
            </div>
            <Clock className="opacity-20" size={48} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New Invitation</h3>

        <form onSubmit={handleCreateInvitation} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
              {copiedToken && <div className="mt-1 text-xs">Invitation link copied to clipboard!</div>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user@example.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Invitation'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Invitation List</h3>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Expires</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No invitations found
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((invitation) => (
                  <tr key={invitation.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-900">{invitation.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invitation.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {invitation.used ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">Used</span>
                          </>
                        ) : isExpired(invitation.expires_at) ? (
                          <>
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600 font-medium">Expired</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-600 font-medium">Active</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      {!invitation.used && !isExpired(invitation.expires_at) && (
                        <button
                          onClick={() => copyInvitationLink(invitation.token)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
                        >
                          <Copy className="w-4 h-4" />
                          <span>
                            {copiedToken === invitation.token ? 'Copied!' : 'Copy Link'}
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
