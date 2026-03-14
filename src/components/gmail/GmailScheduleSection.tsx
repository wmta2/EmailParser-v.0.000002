import { useState, useEffect } from 'react';
import { Clock, Save } from 'lucide-react';
import type { GmailSyncSchedule } from '../../lib/supabase';

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

interface Props {
  schedule: GmailSyncSchedule | null;
  loading: boolean;
  saving: boolean;
  onSave: (updates: Partial<GmailSyncSchedule>) => Promise<any>;
}

export function GmailScheduleSection({ schedule, loading, saving, onSave }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [peakStart, setPeakStart] = useState('08:00');
  const [peakEnd, setPeakEnd] = useState('18:00');
  const [peakInterval, setPeakInterval] = useState(15);
  const [offPeakInterval, setOffPeakInterval] = useState(60);
  const [timezone, setTimezone] = useState('UTC');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled);
      setPeakStart(schedule.peak_start_time.slice(0, 5));
      setPeakEnd(schedule.peak_end_time.slice(0, 5));
      setPeakInterval(schedule.peak_interval_minutes);
      setOffPeakInterval(schedule.off_peak_interval_minutes);
      setTimezone(schedule.timezone);
    }
  }, [schedule]);

  const handleSave = async () => {
    const err = await onSave({
      enabled,
      peak_start_time: peakStart + ':00',
      peak_end_time: peakEnd + ':00',
      peak_interval_minutes: peakInterval,
      off_peak_interval_minutes: offPeakInterval,
      timezone,
    });
    setSaveMessage(err ? (err.message || 'Failed to save') : 'Schedule saved');
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

      <div className="space-y-5">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm font-medium text-slate-700">Enable Automatic Sync</span>
            <p className="text-xs text-slate-500 mt-0.5">Gmail will be checked automatically at the intervals below</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-slate-900' : 'bg-slate-200'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
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

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Peak Hours</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                value={peakStart}
                onChange={(e) => setPeakStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <input
                type="time"
                value={peakEnd}
                onChange={(e) => setPeakEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Check every</label>
            <div className="flex items-center gap-2">
              <select
                value={peakInterval}
                onChange={(e) => setPeakInterval(Number(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Off-Peak Hours</p>
          <p className="text-xs text-slate-500 mb-3">All hours outside the peak window above</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Check every</label>
            <select
              value={offPeakInterval}
              onChange={(e) => setOffPeakInterval(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
            </select>
          </div>
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
