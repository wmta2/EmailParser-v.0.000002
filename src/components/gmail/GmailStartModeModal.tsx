import { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';

export type StartMode = 'manually' | 'specific_date' | 'all' | 'from_now';

interface Props {
  currentMode: StartMode | null;
  currentStartDate: string | null;
  onSave: (mode: StartMode, specificDate: string | null) => Promise<void>;
  onClose: () => void;
}

const OPTIONS: {
  value: StartMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'manually',
    label: 'Choose manually',
    description: 'You decide when to sync. Only new emails since the last sync will be fetched each time you click Sync Now.',
  },
  {
    value: 'specific_date',
    label: 'Since specific date',
    description: 'Import emails received on or after a date you choose. Only applies when resetting the checkpoint.',
  },
  {
    value: 'all',
    label: 'All',
    description: 'Import every email in your inbox with no date restriction. May take a long time for large inboxes.',
  },
  {
    value: 'from_now',
    label: 'From now on',
    description: 'Only emails received after you save this setting will be imported. Older emails are ignored.',
  },
];

export function GmailStartModeModal({ currentMode, currentStartDate, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<StartMode>(currentMode ?? 'from_now');
  const [specificDate, setSpecificDate] = useState(
    currentStartDate ? currentStartDate.slice(0, 16) : ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (selected === 'specific_date' && !specificDate) return;
    setSaving(true);
    await onSave(selected, selected === 'specific_date' ? new Date(specificDate).toISOString() : null);
    setSaving(false);
  };

  const isValid = selected !== 'specific_date' || !!specificDate;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Choose where to start</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-4">
          <p className="text-sm text-slate-700 mb-1">
            <span className="font-semibold">From which point do you want to start processing data once syncing is running?</span>{' '}
            You can process either new or existing emails in your account.
          </p>
          <p className="text-sm text-slate-500 mb-5">
            <span className="font-semibold">Select one option to continue</span>
            <span className="text-red-500 ml-0.5">*</span>
          </p>

          <div className="space-y-3">
            {OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <div className="mt-0.5 flex-shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selected === opt.value
                        ? 'border-slate-900 bg-slate-900'
                        : 'border-slate-300 group-hover:border-slate-500'
                    }`}
                    onClick={() => setSelected(opt.value)}
                  >
                    {selected === opt.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1" onClick={() => setSelected(opt.value)}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" title={opt.description} />
                  </div>
                  {selected === opt.value && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {selected === 'specific_date' && (
            <div className="mt-4 pl-7">
              <label className="block text-xs font-medium text-slate-700 mb-1">Start date &amp; time</label>
              <input
                type="datetime-local"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="px-5 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
