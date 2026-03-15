import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Filter, AlertTriangle, Tag } from 'lucide-react';
import type { GmailImportRule } from '../../lib/supabase';
import type { EmailTemplatePattern } from '../../lib/templateEngine';

interface RuleFormData {
  name: string;
  match_field: GmailImportRule['match_field'];
  match_type: GmailImportRule['match_type'];
  match_value: string;
  action: GmailImportRule['action'];
  template_id: string | null;
  platform: string;
  enabled: boolean;
  priority: number;
}

const EMPTY_FORM: RuleFormData = {
  name: '',
  match_field: 'sender',
  match_type: 'contains',
  match_value: '',
  action: 'import_only',
  template_id: null,
  platform: '',
  enabled: true,
  priority: 0,
};

const ACTION_STYLES: Record<string, string> = {
  import_only: 'bg-blue-100 text-blue-700',
  parse_with_template: 'bg-green-100 text-green-700',
  skip: 'bg-slate-100 text-slate-600',
};

const ACTION_LABELS: Record<string, string> = {
  import_only: 'Import Only',
  parse_with_template: 'Parse with Template',
  skip: 'Skip',
};

const PLATFORM_COLORS: Record<string, string> = {
  ProcureWizard: 'bg-orange-100 text-orange-700',
  Fourth: 'bg-cyan-100 text-cyan-700',
  ZonalConnect: 'bg-teal-100 text-teal-700',
  Acquire: 'bg-rose-100 text-rose-700',
  WooCommerce: 'bg-purple-100 text-purple-700',
};

function getPlatformStyle(platform: string): string {
  return PLATFORM_COLORS[platform] ?? 'bg-slate-100 text-slate-600';
}

interface Props {
  rules: GmailImportRule[];
  loading: boolean;
  saving: boolean;
  templates: EmailTemplatePattern[];
  onCreate: (rule: Omit<GmailImportRule, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<GmailImportRule>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onMove: (id: string, direction: 'up' | 'down') => Promise<void>;
}

export function GmailRulesSection({ rules, loading, saving, templates, onCreate, onUpdate, onDelete, onMove }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (rule: GmailImportRule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      match_field: rule.match_field,
      match_type: rule.match_type,
      match_value: rule.match_value,
      action: rule.action,
      template_id: rule.template_id,
      platform: rule.platform ?? '',
      enabled: rule.enabled,
      priority: rule.priority,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError('Rule name is required'); return; }
    if (!form.match_value.trim()) { setFormError('Match value is required'); return; }
    if (form.action === 'parse_with_template' && !form.template_id) { setFormError('Select a template for this action'); return; }

    setFormError(null);
    const payload = {
      ...form,
      platform: form.platform.trim() || null,
    };
    let err;
    if (editingId) {
      err = await onUpdate(editingId, payload);
    } else {
      err = await onCreate(payload);
    }

    if (!err) {
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } else {
      setFormError(err.message || 'Failed to save rule');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Import Rules</h3>
          {rules.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {rules.length} rule{rules.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={openCreate}
          disabled={showForm}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {showForm && (
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h4 className="font-medium text-slate-900 mb-4">{editingId ? 'Edit Rule' : 'New Rule'}</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Orders from Acme Corp"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Platform Tag
                  <span className="ml-1.5 text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.platform}
                  onChange={(e) => setForm(f => ({ ...f, platform: e.target.value }))}
                  placeholder="e.g. ProcureWizard, Fourth, ZonalConnect"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Match Field</label>
                <select
                  value={form.match_field}
                  onChange={(e) => setForm(f => ({ ...f, match_field: e.target.value as GmailImportRule['match_field'] }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                >
                  <option value="sender">Sender</option>
                  <option value="subject">Subject</option>
                  <option value="body">Body</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Match Type</label>
                <select
                  value={form.match_type}
                  onChange={(e) => setForm(f => ({ ...f, match_type: e.target.value as GmailImportRule['match_type'] }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                >
                  <option value="contains">Contains</option>
                  <option value="exact">Exact Match</option>
                  <option value="starts_with">Starts With</option>
                  <option value="regex">Regex</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
                <select
                  value={form.action}
                  onChange={(e) => setForm(f => ({ ...f, action: e.target.value as GmailImportRule['action'], template_id: e.target.value !== 'parse_with_template' ? null : f.template_id }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                >
                  <option value="import_only">Import Only</option>
                  <option value="parse_with_template">Parse with Template</option>
                  <option value="skip">Skip</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Match Value</label>
              <input
                type="text"
                value={form.match_value}
                onChange={(e) => setForm(f => ({ ...f, match_value: e.target.value }))}
                placeholder={form.match_field === 'sender' ? 'e.g. orders@acme.com' : form.match_field === 'subject' ? 'e.g. New Order' : 'e.g. purchase order'}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
              />
            </div>

            {form.action === 'parse_with_template' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template</label>
                <select
                  value={form.template_id || ''}
                  onChange={(e) => setForm(f => ({ ...f, template_id: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                >
                  <option value="">Select a template...</option>
                  {templates.filter(t => t.active).map(t => (
                    <option key={t.id} value={t.id}>{t.template_name}</option>
                  ))}
                </select>
              </div>
            )}

            {form.platform.trim() && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <Tag className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Matched emails will have their platform set to <strong>{form.platform.trim()}</strong>
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm(f => ({ ...f, enabled: e.target.checked }))}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-sm font-medium text-slate-700">Rule enabled</span>
            </label>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-700 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Rule' : 'Create Rule'}
              </button>
              <button
                onClick={handleCancel}
                className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-slate-500 text-sm">Loading rules...</div>
      ) : rules.length === 0 && !showForm ? (
        <div className="p-8 text-center">
          <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-1">No import rules yet</p>
          <p className="text-xs text-slate-400">Rules filter which emails are imported and how. Without rules, no emails will be imported.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {rules.map((rule, index) => (
            <div key={rule.id} className={`px-6 py-4 flex items-center gap-4 ${!rule.enabled ? 'opacity-50' : ''}`}>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => onMove(rule.id, 'up')}
                  disabled={index === 0}
                  className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMove(rule.id, 'down')}
                  disabled={index === rules.length - 1}
                  className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 flex-shrink-0">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-slate-900 text-sm truncate">{rule.name}</span>
                  {!rule.enabled && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">disabled</span>
                  )}
                  {rule.platform && (
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${getPlatformStyle(rule.platform)}`}>
                      <Tag className="w-3 h-3" />
                      {rule.platform}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 capitalize">{rule.match_field}</span>
                  <span className="text-xs text-slate-400">{rule.match_type.replace('_', ' ')}</span>
                  <span className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[200px]">
                    {rule.match_value}
                  </span>
                </div>
              </div>

              <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${ACTION_STYLES[rule.action]}`}>
                {ACTION_LABELS[rule.action]}
              </span>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(rule)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Edit rule"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  disabled={deletingId === rule.id}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rules.length > 0 && !showForm && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            Rules are evaluated in priority order. The first matching rule wins. Emails that match no rules are skipped.
          </p>
        </div>
      )}
    </div>
  );
}
