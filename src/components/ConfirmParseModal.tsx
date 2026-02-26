import { AlertTriangle, X } from 'lucide-react';
import type { DetectionResult } from '../hooks/useEmails';
import type { EmailWithOrder } from '../lib/supabase';

interface ConfirmParseModalProps {
  emails: EmailWithOrder[];
  templateDetections: Map<number, DetectionResult>;
  selectedEmailIds?: Set<number>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmParseModal({ emails, templateDetections, selectedEmailIds, onConfirm, onCancel }: ConfirmParseModalProps) {
  const unparsedEmails = emails.filter(e => {
    if (!e.order) {
      if (selectedEmailIds && selectedEmailIds.size > 0) {
        return selectedEmailIds.has(e.id);
      }
      return true;
    }
    return false;
  });

  const templateGroups = new Map<string, { count: number; avgConfidence: number; lowConfidence: number }>();

  unparsedEmails.forEach(email => {
    const detection = templateDetections.get(email.id);
    if (detection) {
      const existing = templateGroups.get(detection.templateType) || { count: 0, avgConfidence: 0, lowConfidence: 0 };
      existing.count += 1;
      existing.avgConfidence += detection.confidence;
      if (detection.confidence < 0.6) {
        existing.lowConfidence += 1;
      }
      templateGroups.set(detection.templateType, existing);
    }
  });

  templateGroups.forEach((group) => {
    group.avgConfidence = group.avgConfidence / group.count;
  });

  const hasLowConfidence = Array.from(templateGroups.values()).some(g => g.lowConfidence > 0);
  const hasUnknown = templateGroups.has('unknown');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Confirm Bulk Parse</h3>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600 mb-2">
              {selectedEmailIds && selectedEmailIds.size > 0 ? 'Selected emails:' : 'Total unparsed emails:'}
            </p>
            <p className="text-3xl font-bold text-slate-900">{unparsedEmails.length}</p>
          </div>

          {(hasLowConfidence || hasUnknown) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 mb-1">Warning</p>
                <p className="text-sm text-amber-800">
                  {hasUnknown && 'Some emails have unknown templates and may fail to parse. '}
                  {hasLowConfidence && !hasUnknown && 'Some emails have low confidence template matches and may fail to parse. '}
                  You can review these emails individually before parsing.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-sm">Template Breakdown:</h4>
            <div className="space-y-2">
              {Array.from(templateGroups.entries())
                .sort((a, b) => b[1].count - a[1].count)
                .map(([templateType, group]) => {
                  const confidencePercent = Math.round(group.avgConfidence * 100);

                  let bgColor = 'bg-slate-100';
                  let textColor = 'text-slate-700';

                  if (templateType === 'unknown') {
                    bgColor = 'bg-gray-100';
                    textColor = 'text-gray-700';
                  } else if (group.avgConfidence >= 0.8) {
                    bgColor = 'bg-green-50';
                    textColor = 'text-green-700';
                  } else if (group.avgConfidence >= 0.6) {
                    bgColor = 'bg-yellow-50';
                    textColor = 'text-yellow-700';
                  } else {
                    bgColor = 'bg-orange-50';
                    textColor = 'text-orange-700';
                  }

                  return (
                    <div
                      key={templateType}
                      className={`flex items-center justify-between p-3 rounded-lg ${bgColor}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${textColor}`}>
                          {templateType === 'unknown' ? 'Unknown' : templateType}
                        </span>
                        {templateType !== 'unknown' && (
                          <span className={`text-sm ${textColor} opacity-75`}>
                            (avg: {confidencePercent}%)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${textColor}`}>{group.count}</span>
                        {group.lowConfidence > 0 && (
                          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                            {group.lowConfidence} low
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Parse All
          </button>
        </div>
      </div>
    </div>
  );
}
