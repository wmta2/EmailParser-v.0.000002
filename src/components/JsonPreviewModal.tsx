import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface JsonPreviewModalProps {
  title: string;
  subtitle?: string;
  json: Record<string, unknown> | unknown[] | null;
  onClose: () => void;
}

export function JsonPreviewModal({ title, subtitle, json, onClose }: JsonPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  async function handleCopy() {
    if (!json) return;
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const formattedJson = json ? JSON.stringify(json, null, 2) : '';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {json && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy JSON
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4">
          {json ? (
            <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs font-mono leading-relaxed">
              {highlightJson(formattedJson)}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              No data to display
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-400">
            Press Escape or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}

function highlightJson(jsonString: string): React.ReactNode {
  const lines = jsonString.split('\n');

  return lines.map((line, index) => {
    const highlighted = line
      .replace(/"([^"]+)":/g, '<span class="text-sky-400">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="text-amber-300">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="text-emerald-400">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-purple-400">$1</span>')
      .replace(/: (null)/g, ': <span class="text-slate-500">$1</span>');

    return (
      <span key={index}>
        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
        {index < lines.length - 1 && '\n'}
      </span>
    );
  });
}
