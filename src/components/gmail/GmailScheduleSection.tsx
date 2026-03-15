import { useState, useEffect } from 'react';
import { Clock, Save, Plus, Trash2 } from 'lucide-react';
import { useGmailSettingsConfig, useGmailScheduleWindows } from '../../hooks/useGmailSettings';
import type { GmailScheduleWindow } from '../../hooks/useGmailSettings';

const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_EMAIL_OPTIONS = [1, 2, 5, 10, 20, 50];
const INTERVAL_OPTIONS = [5, 10, 15, 30, 60];

type DraftWindow = Omit<GmailScheduleWindow, 'created_at' | 'updated_at'> & { _isNew?: boolean };

function generateTempId() {
  return 'new_' + Math.random().toString(36).slice(2);
}

export function GmailScheduleSection() {
  const { settings, loading: settingsLoading, saving: settingsSaving, saveSettings } = useGmailSettingsConfig();
  const { windows, loading: windowsLoading, saving: windowsSaving, saveWindows } = useGmailScheduleWindows();

  const [syncEnabled, setSyncEnabled] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [maxEmailsPerSync, setMaxEmailsPerSync] = useState(10);
  const [draftWindows, setDraftWindows] = useState<DraftWindow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loading = settingsLoading || windowsLoading;
  const saving = settingsSaving || windowsSaving;

  useEffect(() => {
    if (settings) {
      setSyncEnabled(settings.sync_enabled);
      setTimezone(settings.timezone);
      setMaxEmailsPerSync(settings.max_emails_per_sync);
    }
  }, [settings]);

  useEffect(() => {
    setDraftWindows(windows.map(w => ({ ...w })));
  }, [windows]);

  const addWindow = () => {
    const newWindow: DraftWindow = {
      id: generateTempId(),
      enabled: true,
      day_of_week: 1,
      start_time: '09:00:00',
      end_time: '17:00:00',
      interval_minutes: 15,
      sort_order: draftWindows.length,
      _isNew: true,
    };
    setDraftWindows(prev => [...prev, newWindow]);
  };

  const updateWindow = (id: string, field: keyof DraftWindow, value: unknown) => {
    setDraftWindows(prev =>
      prev.map(w => w.id === id ? { ...w, [field]: value } : w)
    );
  };

  const removeWindow = (id: string, isNew: boolean) => {
    setDraftWindows(prev => prev.filter(w => w.id !== id));
    if (!isNew) {
      setDeletedIds(prev => [...prev, id]);
    }
  };

  const handleSave = async () => {
    const settingsErr = await saveSettings({
      sync_enabled: syncEnabled,
      timezone,
      max_emails_per_sync: maxEmailsPerSync,
    });

    const toUpsert = draftWindows.map(({ _isNew, id, ...rest }) => ({
      ...rest,
      ...(_isNew ? {} : { id }),
    })) as Omit<GmailScheduleWindow, 'created_at' | 'updated_at'>[];

    const windowsErr = await saveWindows(toUpsert, deletedIds);

    if (!settingsErr && !windowsErr) {
      setDeletedIds([]);
      setSaveMessage('Schedule saved');
    } else {
      setSaveMessage('Failed to save');
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-900">Sync Schedule</h3>
        </div>
        <div className="text-slate-500 text-sm">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <Clock className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold text-slate-900">Sync Schedule</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-4 pb-5 border-b border-slate-100">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-700">Enable Auto-Sync</span>
              <p className="text-xs text-slate-500 mt-0.5">Gmail will be checked on the schedule below</p>
            </div>
            <button
              onClick={() => setSyncEnabled(!syncEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${syncEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${syncEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max emails per sync</label>
            <p className="text-xs text-slate-500 mb-1.5">Lower values let you import a small test batch first.</p>
            <select
              value={maxEmailsPerSync}
              onChange={(e) => setMaxEmailsPerSync(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            >
              {MAX_EMAIL_OPTIONS.map(n => (
                <option key={n} value={n}>{n} email{n !== 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Schedule Windows</p>
            <button
              onClick={addWindow}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Window
            </button>
          </div>

          {draftWindows.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-lg">
              No windows configured. Add one to enable automatic syncing.
            </div>
          ) : (
            <div className="space-y-3">
              {draftWindows.map((w) => (
                <div key={w.id} className="border border-slate-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateWindow(w.id, 'enabled', !w.enabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${w.enabled ? 'bg-slate-900' : 'bg-slate-200'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${w.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                      <select
                        value={w.day_of_week}
                        onChange={(e) => updateWindow(w.id, 'day_of_week', Number(e.target.value))}
                        className="px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                      >
                        {DAY_NAMES.map((name, i) => (
                          <option key={i} value={i}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => removeWindow(w.id, !!w._isNew)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
                      <input
                        type="time"
                        value={w.start_time.slice(0, 5)}
                        onChange={(e) => updateWindow(w.id, 'start_time', e.target.value + ':00')}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
                      <input
                        type="time"
                        value={w.end_time.slice(0, 5)}
                        onChange={(e) => updateWindow(w.id, 'end_time', e.target.value + ':00')}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Every</label>
                      <select
                        value={w.interval_minutes}
                        onChange={(e) => updateWindow(w.id, 'interval_minutes', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
                      >
                        {INTERVAL_OPTIONS.map(n => (
                          <option key={n} value={n}>{n} min</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
