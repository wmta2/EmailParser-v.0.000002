import React, { useState } from 'react';
import { MousePointer, Trash2, CheckCircle, AlertCircle, X, Table2, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { DOMFieldConfig, DOMTableConfig } from '../lib/domEmailParser';
import { SelectorOption, testSelector } from '../lib/domUtils';
import { TABLE_COLUMN_FIELDS } from '../lib/domConfigMapper';

const TRANSFORM_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'trim', label: 'Trim whitespace' },
  { value: 'extractNumber', label: 'Extract number' },
  { value: 'extractDate', label: 'Extract date' },
  { value: 'upperCase', label: 'Uppercase' },
  { value: 'lowerCase', label: 'Lowercase' },
];

interface FieldMappingPanelProps {
  domConfig: {
    fields: Record<string, DOMFieldConfig>;
    lineItems?: DOMTableConfig;
  };
  html?: string;
  onStartMapping: (fieldPath: string) => void;
  onRemoveField: (fieldPath: string) => void;
  onFieldUpdate: (fieldPath: string, config: DOMFieldConfig) => void;
  onTableUpdate: (tableConfig: DOMTableConfig) => void;
  onStartTableColumnMapping: (columnKey: string) => void;
  onRemoveTableColumn: (columnKey: string) => void;
  selectionMode: {
    active: boolean;
    fieldPath: string;
    fieldType: 'field' | 'table-column' | 'table-row';
  } | null;
  onCancelMapping: () => void;
  selectorAlternatives?: Record<string, SelectorOption[]>;
  onSelectAlternative?: (fieldPath: string, selector: string) => void;
}

type FieldCategory = 'order' | 'delivery' | 'billing' | 'items';

interface FieldDefinition {
  path: string;
  label: string;
  category: FieldCategory;
}

const FIELD_DEFINITIONS: FieldDefinition[] = [
  { path: 'orderNumber', label: 'Order Number', category: 'order' },
  { path: 'requester', label: 'Requester', category: 'order' },
  { path: 'supplierCode', label: 'Supplier Code', category: 'order' },
  { path: 'accountNumber', label: 'Import Account Number', category: 'order' },
  { path: 'currency', label: 'Currency', category: 'order' },
  { path: 'fullAddress', label: 'Full Address (Single Block)', category: 'order' },
  { path: 'requiredDate', label: 'Required Date / Delivery Date', category: 'order' },
  { path: 'notes', label: 'Notes', category: 'order' },
  { path: 'orderDate', label: 'Order Date', category: 'order' },
  { path: 'customerName', label: 'Customer Name', category: 'order' },
  { path: 'customerEmail', label: 'Customer Email', category: 'order' },
  { path: 'customerPhone', label: 'Customer Phone', category: 'order' },
  { path: 'totalAmount', label: 'Total Amount', category: 'order' },

  { path: 'deliveryAddress.name', label: 'Name', category: 'delivery' },
  { path: 'deliveryAddress.line1', label: 'Address Line 1', category: 'delivery' },
  { path: 'deliveryAddress.line2', label: 'Address Line 2', category: 'delivery' },
  { path: 'deliveryAddress.city', label: 'City', category: 'delivery' },
  { path: 'deliveryAddress.state', label: 'State/County', category: 'delivery' },
  { path: 'deliveryAddress.postalCode', label: 'Postal Code', category: 'delivery' },
  { path: 'deliveryAddress.country', label: 'Country', category: 'delivery' },

  { path: 'billingAddress.name', label: 'Name', category: 'billing' },
  { path: 'billingAddress.line1', label: 'Address Line 1', category: 'billing' },
  { path: 'billingAddress.line2', label: 'Address Line 2', category: 'billing' },
  { path: 'billingAddress.city', label: 'City', category: 'billing' },
  { path: 'billingAddress.state', label: 'State/County', category: 'billing' },
  { path: 'billingAddress.postalCode', label: 'Postal Code', category: 'billing' },
  { path: 'billingAddress.country', label: 'Country', category: 'billing' },
];

function InlinePreview({ html, selector }: { html?: string; selector: string }) {
  if (!html || !selector) return null;
  const result = testSelector(html, selector);
  if (!result.isValid) {
    return <div className="text-[10px] text-red-500 mt-1 truncate">Error: {result.error}</div>;
  }
  if (!result.extractedValue) {
    return <div className="text-[10px] text-amber-500 mt-1">No match</div>;
  }
  return (
    <div className="text-[10px] text-green-700 mt-1 truncate" title={result.extractedValue}>
      = {result.extractedValue}
    </div>
  );
}

export function FieldMappingPanel({
  domConfig,
  html,
  onStartMapping,
  onRemoveField,
  onFieldUpdate,
  onTableUpdate,
  onStartTableColumnMapping,
  onRemoveTableColumn,
  selectionMode,
  onCancelMapping,
  selectorAlternatives,
  onSelectAlternative
}: FieldMappingPanelProps) {
  const [activeTab, setActiveTab] = useState<FieldCategory>('order');
  const [expandedAlternatives, setExpandedAlternatives] = useState<Set<string>>(new Set());
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState(false);
  const [editingColumns, setEditingColumns] = useState<Set<string>>(new Set());

  const toggleAlternatives = (fieldPath: string) => {
    setExpandedAlternatives(prev => {
      const next = new Set(prev);
      if (next.has(fieldPath)) {
        next.delete(fieldPath);
      } else {
        next.add(fieldPath);
      }
      return next;
    });
  };

  const toggleEditing = (fieldPath: string) => {
    setEditingFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldPath)) {
        next.delete(fieldPath);
      } else {
        next.add(fieldPath);
      }
      return next;
    });
  };

  const toggleColumnEditing = (key: string) => {
    setEditingColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const tabs: { id: FieldCategory; label: string }[] = [
    { id: 'order', label: 'Order Fields' },
    { id: 'delivery', label: 'Delivery Address' },
    { id: 'billing', label: 'Billing Address' },
    { id: 'items', label: 'Line Items' },
  ];

  const fieldsForTab = FIELD_DEFINITIONS.filter(f => f.category === activeTab);

  const getFieldStatus = (fieldPath: string): 'mapped' | 'unmapped' | 'active' => {
    if (selectionMode?.fieldPath === fieldPath) return 'active';
    if (domConfig.fields[fieldPath]?.selector) return 'mapped';
    return 'unmapped';
  };

  const handleSelectorEdit = (fieldPath: string, newSelector: string) => {
    const existing = domConfig.fields[fieldPath];
    onFieldUpdate(fieldPath, {
      selector: newSelector,
      attribute: existing?.attribute,
      transform: existing?.transform,
    });
  };

  const handleTransformChange = (fieldPath: string, transform: string) => {
    const existing = domConfig.fields[fieldPath];
    if (!existing) return;
    onFieldUpdate(fieldPath, {
      ...existing,
      transform: transform || undefined,
    });
  };

  const handleRowSelectorEdit = (newSelector: string) => {
    onTableUpdate({
      rowSelector: newSelector,
      columns: domConfig.lineItems?.columns || {}
    });
  };

  const handleColumnSelectorEdit = (key: string, newSelector: string) => {
    if (!domConfig.lineItems) return;
    onTableUpdate({
      rowSelector: domConfig.lineItems.rowSelector,
      columns: {
        ...domConfig.lineItems.columns,
        [key]: {
          ...domConfig.lineItems.columns[key],
          selector: newSelector,
        }
      }
    });
  };

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col">
      <div className="border-b bg-white">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {selectionMode?.active && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <MousePointer className="w-4 h-4" />
              <span className="text-sm font-medium">
                Mapping: {FIELD_DEFINITIONS.find(f => f.path === selectionMode.fieldPath)?.label
                  || (selectionMode.fieldType === 'table-row' ? 'Table Row' : selectionMode.fieldPath)}
              </span>
            </div>
            <button
              onClick={onCancelMapping}
              className="p-1 hover:bg-blue-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {activeTab === 'items' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              First select a table row, then map individual columns like SKU, quantity, and price.
            </p>

            <div className="bg-white rounded border p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Table Row Pattern</span>
                </div>
                <div className="flex items-center gap-1">
                  {domConfig.lineItems?.rowSelector && (
                    <button
                      onClick={() => setEditingRow(!editingRow)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Edit selector manually"
                    >
                      <Pencil className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                  {domConfig.lineItems?.rowSelector && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>

              {domConfig.lineItems?.rowSelector && !editingRow && (
                <div className="text-xs text-gray-600 mb-2 font-mono bg-gray-50 p-2 rounded overflow-x-auto">
                  {domConfig.lineItems.rowSelector}
                </div>
              )}

              {domConfig.lineItems?.rowSelector && editingRow && (
                <div className="mb-2">
                  <input
                    type="text"
                    value={domConfig.lineItems.rowSelector}
                    onChange={(e) => handleRowSelectorEdit(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="XPath for row selection"
                  />
                </div>
              )}

              <button
                onClick={() => onStartMapping('lineItems')}
                disabled={selectionMode?.active || false}
                className="w-full px-3 py-1.5 text-sm rounded flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MousePointer className="w-3 h-3" />
                {domConfig.lineItems?.rowSelector ? 'Remap Table Row' : 'Select Table Row'}
              </button>
            </div>

            {domConfig.lineItems?.rowSelector && (
              <>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-4 mb-2">
                  Column Mapping
                </div>
                {TABLE_COLUMN_FIELDS.map(({ key, label }) => {
                  const isMapping = selectionMode?.fieldPath === key && selectionMode?.fieldType === 'table-column';
                  const isMapped = domConfig.lineItems?.columns[key]?.selector;
                  const isEditingCol = editingColumns.has(key);

                  return (
                    <div
                      key={key}
                      className={`bg-white rounded border p-3 transition-all ${
                        isMapping ? 'border-blue-500 shadow-md' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isMapped ? (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : isMapping ? (
                            <MousePointer className="w-4 h-4 text-blue-600 flex-shrink-0 animate-pulse" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900">{label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isMapped && (
                            <button
                              onClick={() => toggleColumnEditing(key)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Edit selector manually"
                            >
                              <Pencil className="w-3 h-3 text-gray-500" />
                            </button>
                          )}
                          {isMapped && (
                            <button
                              onClick={() => onRemoveTableColumn(key)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Remove mapping"
                            >
                              <Trash2 className="w-3 h-3 text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isMapped && !isEditingCol && (
                        <div className="text-xs text-gray-600 mb-2 font-mono bg-gray-50 p-2 rounded overflow-x-auto">
                          {domConfig.lineItems!.columns[key].selector}
                        </div>
                      )}

                      {isMapped && isEditingCol && (
                        <div className="mb-2">
                          <input
                            type="text"
                            value={domConfig.lineItems!.columns[key].selector}
                            onChange={(e) => handleColumnSelectorEdit(key, e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Relative XPath for column"
                          />
                        </div>
                      )}

                      {!isMapping && (
                        <button
                          onClick={() => onStartTableColumnMapping(key)}
                          disabled={selectionMode?.active || false}
                          className={`w-full px-3 py-1.5 text-sm rounded flex items-center justify-center gap-2 ${
                            isMapped
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <MousePointer className="w-3 h-3" />
                          {isMapped ? 'Remap' : 'Click to Map'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        ) : (
          fieldsForTab.map(field => {
            const status = getFieldStatus(field.path);
            const config = domConfig.fields[field.path];
            const isEditing = editingFields.has(field.path);

            return (
              <div
                key={field.path}
                className={`bg-white rounded border p-3 transition-all ${
                  status === 'active' ? 'border-blue-500 shadow-md' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {status === 'mapped' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : status === 'active' ? (
                      <MousePointer className="w-4 h-4 text-blue-600 flex-shrink-0 animate-pulse" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-900">{field.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {status === 'mapped' && (
                      <button
                        onClick={() => toggleEditing(field.path)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit selector manually"
                      >
                        <Pencil className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                    {status === 'unmapped' && (
                      <button
                        onClick={() => {
                          onFieldUpdate(field.path, { selector: '', attribute: undefined });
                          setEditingFields(prev => new Set(prev).add(field.path));
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Write XPath manually"
                      >
                        <Pencil className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                    {status === 'mapped' && (
                      <button
                        onClick={() => onRemoveField(field.path)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Remove mapping"
                      >
                        <Trash2 className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>

                {status === 'mapped' && config ? (
                  <div className="mb-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={config.selector}
                          onChange={(e) => handleSelectorEdit(field.path, e.target.value)}
                          className="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="XPath expression"
                        />
                        <select
                          value={config.transform || ''}
                          onChange={(e) => handleTransformChange(field.path, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {TRANSFORM_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <InlinePreview html={html} selector={config.selector} />
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded overflow-x-auto">
                          {config.selector}
                        </div>
                        {config.transform && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            Transform: {config.transform}
                          </div>
                        )}
                        <InlinePreview html={html} selector={config.selector} />
                      </>
                    )}

                    {!isEditing && selectorAlternatives?.[field.path] && selectorAlternatives[field.path].length > 1 && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleAlternatives(field.path)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          {expandedAlternatives.has(field.path) ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          {selectorAlternatives[field.path].length - 1} alternative{selectorAlternatives[field.path].length - 1 !== 1 ? 's' : ''}
                        </button>

                        {expandedAlternatives.has(field.path) && (
                          <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                            {selectorAlternatives[field.path]
                              .filter(alt => alt.selector !== config.selector)
                              .map((alt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => onSelectAlternative?.(field.path, alt.selector)}
                                  className="w-full text-left p-1.5 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                >
                                  <div className="text-xs font-mono text-gray-600 break-all">{alt.selector}</div>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[10px] text-gray-400">{alt.explanation}</span>
                                    <span className={`text-[10px] font-medium px-1 rounded ${
                                      alt.score >= 90 ? 'bg-green-100 text-green-700' :
                                      alt.score >= 75 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>{alt.score}</span>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

                {status !== 'active' && !isEditing && (
                  <button
                    onClick={() => onStartMapping(field.path)}
                    disabled={selectionMode?.active || false}
                    className={`w-full px-3 py-1.5 text-sm rounded flex items-center justify-center gap-2 ${
                      status === 'mapped'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <MousePointer className="w-3 h-3" />
                    {status === 'mapped' ? 'Remap' : 'Click to Map'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
