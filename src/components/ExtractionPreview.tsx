import React, { useEffect, useState } from 'react';
import { Copy, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { DOMFieldConfig, DOMTableConfig, parseDOMEmail } from '../lib/domEmailParser';

interface ExtractionPreviewProps {
  html: string;
  domConfig: {
    fields: Record<string, DOMFieldConfig>;
    lineItems?: DOMTableConfig;
  };
  onExtractedDataChange?: (data: any) => void;
}

export function ExtractionPreview({ html, domConfig, onExtractedDataChange }: ExtractionPreviewProps) {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['root']));

  useEffect(() => {
    if (!html) {
      setExtractedData(null);
      return;
    }

    try {
      const data = parseDOMEmail(html, domConfig.fields, domConfig.lineItems);
      setExtractedData(data);
      onExtractedDataChange?.(data);
    } catch (err) {
      console.error('Extraction error:', err);
      setExtractedData({ error: 'Failed to extract data' });
    }
  }, [html, domConfig]);

  const handleCopy = () => {
    if (extractedData) {
      navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSection = (path: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFieldStatus = (value: any): 'success' | 'warning' | 'error' => {
    if (value === null || value === undefined || value === '') return 'error';
    if (typeof value === 'string' && value.trim() === '') return 'error';
    if (Array.isArray(value) && value.length === 0) return 'warning';
    return 'success';
  };

  const renderValue = (value: any, path: string = 'root', depth: number = 0): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">null</span>;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const status = getFieldStatus(value);
      return (
        <span className={`${
          status === 'success' ? 'text-green-700' :
          status === 'warning' ? 'text-amber-700' :
          'text-red-700'
        }`}>
          "{value}"
        </span>
      );
    }

    if (Array.isArray(value)) {
      const isExpanded = expandedSections.has(path);
      return (
        <div>
          <button
            onClick={() => toggleSection(path)}
            className="text-gray-600 hover:text-gray-900 font-mono"
          >
            {isExpanded ? '▼' : '▶'} Array ({value.length} items)
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {value.map((item, index) => (
                <div key={index} className="border-l-2 border-gray-200 pl-3">
                  <span className="text-gray-500 font-mono text-xs">[{index}]</span>
                  <div className="ml-2">{renderValue(item, `${path}.${index}`, depth + 1)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const isExpanded = expandedSections.has(path);
      const keys = Object.keys(value);
      return (
        <div>
          <button
            onClick={() => toggleSection(path)}
            className="text-gray-600 hover:text-gray-900 font-mono"
          >
            {isExpanded ? '▼' : '▶'} Object ({keys.length} fields)
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {keys.map(key => {
                const fieldPath = `${path}.${key}`;
                const fieldValue = value[key];
                const status = getFieldStatus(fieldValue);

                return (
                  <div key={key} className="border-l-2 border-gray-200 pl-3">
                    <div className="flex items-start gap-2">
                      {status === 'success' ? (
                        <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : status === 'warning' ? (
                        <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-700 font-medium text-sm">{key}:</span>
                        <div className="mt-0.5">{renderValue(fieldValue, fieldPath, depth + 1)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return <span className="text-gray-600">{String(value)}</span>;
  };

  return (
    <div className="w-96 border-l bg-gray-50 flex flex-col">
      <div className="border-b bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Extracted Data</h3>
          <button
            onClick={handleCopy}
            disabled={!extractedData}
            className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Copy JSON"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600">
          Live preview of data extracted from the sample email
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!html ? (
          <div className="text-center text-gray-500 text-sm py-8">
            No sample email loaded
          </div>
        ) : !extractedData ? (
          <div className="text-center text-gray-500 text-sm py-8">
            Extracting data...
          </div>
        ) : extractedData.error ? (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
            {extractedData.error}
          </div>
        ) : (
          <div className="space-y-2 text-sm font-mono">
            {renderValue(extractedData)}
          </div>
        )}
      </div>

      <div className="border-t bg-white p-3">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-gray-600">Extracted</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span className="text-gray-600">Empty</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-600" />
            <span className="text-gray-600">Missing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
