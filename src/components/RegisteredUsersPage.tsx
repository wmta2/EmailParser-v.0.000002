import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UserProfile } from '../lib/supabase';
import { Users, Shield, Search, Edit2, Ban, CheckCircle, X, Star } from 'lucide-react';

interface EditModalProps {
  user: UserProfile;
  currentUserRole: 'super_admin' | 'admin' | 'user';
  onClose: () => void;
  onSave: (userId: string, updates: { role?: string; is_disabled?: boolean }) => Promise<void>;
}

function EditUserModal({ user, currentUserRole, onClose, onSave }: EditModalProps) {
  const [role, setRole] = useState(user.role);
  const [isDisabled, setIsDisabled] = useState(user.is_disabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const availableRoles = currentUserRole === 'super_admin'
    ? ['user', 'admin', 'super_admin']
    : ['user', 'admin'];

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updates: { role?: string; is_disabled?: boolean } = {};
      if (role !== user.role) updates.role = role;
      if (isDisabled !== user.is_disabled) updates.is_disabled = isDisabled;

      if (Object.keys(updates).length > 0) {
        await onSave(user.id, updates);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">Edit User</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input
              type="text"
              value={user.email}
              disabled
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r === 'super_admin' ? 'Super Admin' : r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Account Status</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsDisabled(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  !isDisabled
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                Enabled
              </button>
              <button
                type="button"
                onClick={() => setIsDisabled(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  isDisabled
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Ban className="w-5 h-5" />
                Disabled
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegisteredUsersPage() {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const currentUserRole = currentUser?.role || 'user';
  const isSuperAdmin = currentUserRole === 'super_admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter, currentUserRole]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = users;

    if (!isSuperAdmin) {
      filtered = filtered.filter(user => user.role !== 'super_admin');
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter === 'enabled') {
      filtered = filtered.filter(user => !user.is_disabled);
    } else if (statusFilter === 'disabled') {
      filtered = filtered.filter(user => user.is_disabled);
    }

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const handleSaveUser = async (userId: string, updates: { role?: string; is_disabled?: boolean }) => {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, ...updates } as UserProfile : u))
    );
  };

  const canEditUser = (user: UserProfile): boolean => {
    if (user.id === currentUser?.id) return false;
    if (isSuperAdmin) return true;
    if (currentUserRole === 'admin' && user.role !== 'super_admin') return true;
    return false;
  };

  const getRoleBadge = (role: string, isDisabled: boolean) => {
    if (isDisabled) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Ban size={12} />
          Disabled
        </span>
      );
    }

    if (role === 'super_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <Star size={12} />
          Super Admin
        </span>
      );
    }

    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Shield size={12} />
          Admin
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
        User
      </span>
    );
  };

  const stats = {
    total: isSuperAdmin ? users.length : users.filter(u => u.role !== 'super_admin').length,
    superAdmins: users.filter(u => u.role === 'super_admin').length,
    admins: users.filter(u => u.role === 'admin').length,
    regularUsers: users.filter(u => u.role === 'user').length,
    disabled: users.filter(u => u.is_disabled).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pl-16 lg:pl-0">
        <h2 className="text-3xl font-bold text-slate-900">Registered Users</h2>
        <p className="text-slate-600 mt-1">Manage and view all registered users</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <Users className="opacity-20" size={48} />
          </div>
        </div>

        {isSuperAdmin && (
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Super Admins</p>
                <p className="text-3xl font-bold mt-1">{stats.superAdmins}</p>
              </div>
              <Star className="opacity-20" size={48} />
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-200 text-sm font-medium">Administrators</p>
              <p className="text-3xl font-bold mt-1">{stats.admins}</p>
            </div>
            <Shield className="opacity-20" size={48} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Regular Users</p>
              <p className="text-3xl font-bold mt-1">{stats.regularUsers}</p>
            </div>
            <Users className="opacity-20" size={48} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            {isSuperAdmin && <option value="super_admin">Super Admins</option>}
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Registered</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      user.is_disabled ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-sm text-slate-900">
                      <div className="flex items-center gap-2">
                        {user.email}
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-blue-600 font-medium">(you)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getRoleBadge(user.role, false)}</td>
                    <td className="py-3 px-4">
                      {user.is_disabled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Ban size={12} />
                          Disabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle size={12} />
                          Enabled
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canEditUser(user) && (
                        <button
                          onClick={() => setEditingUser(user)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                          Edit
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

      {editingUser && (
        <EditUserModal
          user={editingUser}
          currentUserRole={currentUserRole}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}
