import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { parseFailedVariantCodesWithCounts } from '../lib/errorParser';

interface JsonPreviewModalProps {
  title: string;
  subtitle?: string;
  json: Record<string, unknown> | unknown[] | null | any;
  onClose: () => void;
  invalidItemsCount?: number;
  errorResponse?: Record<string, unknown> | null;
}

export function JsonPreviewModal({ title, subtitle, json, onClose, invalidItemsCount = 0, errorResponse = null }: JsonPreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const failedVariantData = parseFailedVariantCodesWithCounts(errorResponse);

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
          {(invalidItemsCount > 0 || failedVariantData.notFoundCount > 0 || failedVariantData.missingCount > 0) && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ {invalidItemsCount > 0 && `${invalidItemsCount} invalid code(s)`}
                {invalidItemsCount > 0 && (failedVariantData.notFoundCount > 0 || failedVariantData.missingCount > 0) && ', '}
                {failedVariantData.notFoundCount > 0 && `${failedVariantData.notFoundCount} not found in ERP`}
                {failedVariantData.notFoundCount > 0 && failedVariantData.missingCount > 0 && ', '}
                {failedVariantData.missingCount > 0 && `${failedVariantData.missingCount} missing code(s)`}
              </p>
              <p className="text-xs text-red-700 mt-1">
                Lines with failed codes are highlighted in red below
              </p>
            </div>
          )}
          {json ? (
            <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs font-mono leading-relaxed">
              {highlightJson(formattedJson, failedVariantData.variants)}
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

function highlightJson(jsonString: string, failedVariants: Array<{ code: string; type: 'missing' | 'not_found' }>): React.ReactNode {
  const lines = jsonString.split('\n');

  // Track if we're inside an orderLine with invalid variantCode
  let isInvalidOrderLine = false;
  let braceDepth = 0;
  let orderLineDepth = -1;

  return lines.map((line, index) => {
    // Check if this line starts an orderLine object
    const trimmed = line.trim();

    // Track brace depth
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // Check if we're entering an orderLine
    if (trimmed === '{' && index > 0) {
      const prevLine = lines[index - 1]?.trim();
      if (prevLine && !prevLine.includes('orderLines')) {
        braceDepth++;
        // This is likely an orderLine object
        orderLineDepth = braceDepth;
      }
    } else {
      braceDepth += openBraces - closeBraces;
    }

    // Check for invalid variantCode (undefined, empty, missing, or rejected by ERP)
    if (line.includes('"variantCode"')) {
      if (line.includes('undefined') || line.match(/"variantCode":\s*""/) || line.match(/"variantCode":\s*null/)) {
        isInvalidOrderLine = true;
      } else {
        // Check if this variantCode matches any of the failed variants from ERP
        const variantMatch = line.match(/"variantCode":\s*"([^"]+)"/);
        if (variantMatch) {
          const code = variantMatch[1].toUpperCase();
          const isFailed = failedVariants.some(v => v.code === code);
          isInvalidOrderLine = isFailed;
        } else {
          isInvalidOrderLine = false;
        }
      }
    }

    // Reset when we exit the orderLine object
    if (isInvalidOrderLine && orderLineDepth >= 0 && braceDepth < orderLineDepth) {
      isInvalidOrderLine = false;
      orderLineDepth = -1;
    }

    let highlighted = line
      .replace(/"([^"]+)":/g, '<span class="text-sky-400">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="text-amber-300">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="text-emerald-400">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-purple-400">$1</span>')
      .replace(/: (null)/g, ': <span class="text-slate-500">$1</span>')
      .replace(/: (undefined)/g, ': <span class="text-red-400 font-bold">$1</span>');

    // Apply red background to invalid orderLine entries
    const lineClass = isInvalidOrderLine ? 'bg-red-900/30 border-l-2 border-red-500 pl-2 -ml-2' : '';

    return (
      <span key={index} className={lineClass}>
        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
        {index < lines.length - 1 && '\n'}
      </span>
    );
  });
}
