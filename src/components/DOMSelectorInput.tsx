import { useState } from 'react';
import { ChevronDown, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { DOMFieldConfig } from '../lib/templateEngine';

interface DOMSelectorInputProps {
  label: string;
  value: DOMFieldConfig | null;
  onChange: (value: DOMFieldConfig | null) => void;
  required?: boolean;
  helperText?: string;
}

const TRANSFORM_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'trim', label: 'Trim whitespace' },
  { value: 'extractNumber', label: 'Extract number' },
  { value: 'extractDate', label: 'Extract date' },
  { value: 'upperCase', label: 'Convert to uppercase' },
  { value: 'lowerCase', label: 'Convert to lowercase' },
];

const SELECTOR_EXAMPLES = [
  { name: 'By ID', example: '//*[@id="order-number"]', description: 'Selects element with id="order-number"' },
  { name: 'By Class', example: '//*[contains(@class, "shipping-address")]', description: 'Selects elements containing class "shipping-address"' },
  { name: 'By Tag', example: '//h1', description: 'Selects all <h1> elements' },
  { name: 'By Text Content', example: '//td[contains(text(), "Order Number")]', description: 'Selects <td> containing text "Order Number"' },
  { name: 'Following Sibling', example: '//td[contains(text(), "Order:")]/following-sibling::td[1]', description: 'Finds label, gets next sibling cell' },
  { name: 'Label-Value Pattern', example: '//tr[td[contains(text(), "Total")]]/td[2]', description: 'Finds row by label, gets value column' },
  { name: 'By Attribute', example: '//span[@data-field="total"]', description: 'Selects elements with data-field="total"' },
  { name: 'Table Row', example: '//table//tr[td]', description: 'Selects all table rows with cells' },
  { name: 'Table Column', example: 'td[1]', description: 'Selects first cell (relative to row context)' },
];

export function DOMSelectorInput({ label, value, onChange, required = false, helperText }: DOMSelectorInputProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [selectorError, setSelectorError] = useState<string | null>(null);

  const handleSelectorChange = (newSelector: string) => {
    if (!newSelector.trim()) {
      onChange(null);
      setSelectorError(null);
      return;
    }

    try {
      document.evaluate(newSelector, document, null, XPathResult.ANY_TYPE, null);
      setSelectorError(null);
      onChange({
        selector: newSelector,
        attribute: value?.attribute || null,
        transform: value?.transform || null,
        blockSelector: value?.blockSelector,
        blockParser: value?.blockParser
      });
    } catch (e) {
      setSelectorError('Invalid XPath expression');
      onChange({
        selector: newSelector,
        attribute: value?.attribute || null,
        transform: value?.transform || null,
        blockSelector: value?.blockSelector,
        blockParser: value?.blockParser
      });
    }
  };

  const handleAttributeChange = (newAttribute: string) => {
    if (!value) return;
    onChange({
      ...value,
      attribute: newAttribute.trim() || null
    });
  };

  const handleTransformChange = (newTransform: string) => {
    if (!value) return;
    onChange({
      ...value,
      transform: newTransform || null
    });
  };

  const clearValue = () => {
    onChange(null);
    setSelectorError(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Info className="w-4 h-4" />
          Examples <ChevronDown className={`w-4 h-4 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {helperText && (
        <p className="text-sm text-gray-600">{helperText}</p>
      )}

      {showExamples && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
          <p className="text-sm font-medium text-blue-900 mb-2">XPath Expression Examples:</p>
          {SELECTOR_EXAMPLES.map((example, idx) => (
            <div
              key={idx}
              className="bg-white p-2 rounded border border-blue-100"
            >
              <div className="font-medium text-sm text-gray-900">{example.name}</div>
              <code className="text-xs text-blue-700 block mt-1">{example.example}</code>
              <div className="text-xs text-gray-600 mt-0.5">{example.description}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-600">XPath Expression</label>
            {value && (
              <button
                type="button"
                onClick={clearValue}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="text"
            value={value?.selector || ''}
            onChange={(e) => handleSelectorChange(e.target.value)}
            placeholder='e.g., //span[@id="order"], //td[contains(text(), "Total")]'
            className={`w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 ${
              selectorError
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {selectorError && (
            <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" />
              {selectorError}
            </div>
          )}
          {!selectorError && value?.selector && (
            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              Valid XPath expression
            </div>
          )}
        </div>

        {value && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Attribute (optional)
              </label>
              <input
                type="text"
                value={value.attribute || ''}
                onChange={(e) => handleAttributeChange(e.target.value)}
                placeholder="e.g., data-value, href, title (leave empty for text content)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Extract a specific attribute instead of text content
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Transform (optional)
              </label>
              <select
                value={value.transform || ''}
                onChange={(e) => handleTransformChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TRANSFORM_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Apply a transformation to the extracted value
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
