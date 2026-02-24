import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, ChevronDown, Wand2 } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { DOMSelectorInput } from './DOMSelectorInput';
import { ColumnMappingRow } from './ColumnMappingRow';
import { VisualBuilderModal } from './VisualBuilderModal';
import { SaveSuccessModal } from './SaveSuccessModal';
import type { EmailTemplatePattern, DOMFieldConfig } from '../lib/templateEngine';
import type { DOMFieldConfig as SimpleDOMFieldConfig, DOMTableConfig } from '../lib/domEmailParser';
import { visualBuilderToDOMConfig, domConfigToVisualBuilder, type VisualBuilderConfig } from '../lib/domConfigMapper';

const PLATFORM_OPTIONS = [
  { label: 'Universal (No Platform)', value: null },
  { label: 'WooCommerce', value: 'woocommerce' },
  { label: 'Email', value: 'email' }
];

const TABLE_HEADER_KEYWORDS = [
  { label: 'Item Code', value: 'item code' },
  { label: 'Product', value: 'product' },
  { label: 'Description', value: 'description' },
  { label: 'Quantity', value: 'quantity' },
  { label: 'Qty', value: 'qty' },
  { label: 'Price', value: 'price' },
  { label: 'Unit Price', value: 'unit price' },
  { label: 'Total', value: 'total' },
  { label: 'Amount', value: 'amount' }
];

interface TemplateFormPageProps {
  templateId?: string | null;
  onBack: () => void;
  onSave: () => void;
}

type Tab = 'basic' | 'detection' | 'fields' | 'table';

export function TemplateFormPage({ templateId, onBack, onSave }: TemplateFormPageProps) {
  const { fetchTemplateById, createTemplate, updateTemplate } = useTemplates();
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [formData, setFormData] = useState<Partial<EmailTemplatePattern>>({
    template_name: '',
    template_type: '',
    provider_name: '',
    platform: null,
    detection_keywords: [],
    confidence_threshold: 50,
    dom_config: {},
    table_header_keywords: [],
    column_mapping: {},
    priority: 50,
    active: true
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [columnCount, setColumnCount] = useState(5);
  const [expandedSections, setExpandedSections] = useState({
    basicFields: true,
    deliveryStructured: false,
    billingStructured: false,
    otherFields: true
  });
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [visualBuilderConfig, setVisualBuilderConfig] = useState<VisualBuilderConfig>({ fields: {} });

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  async function loadTemplate() {
    setLoading(true);
    const template = await fetchTemplateById(templateId!);
    if (template) {
      setFormData(template);
      const columnKeys = Object.keys(template.column_mapping);
      const maxCol = columnKeys.length > 0
        ? Math.max(...columnKeys.map(k => parseInt(k)))
        : 1;
      setColumnCount(maxCol + 1);

      // Initialize visual builder config from dom_config
      if (template.dom_config) {
        setVisualBuilderConfig(domConfigToVisualBuilder(template.dom_config));
      }
    }
    setLoading(false);
  }

  const handleSave = async () => {
    if (!formData.template_name || !formData.template_type || !formData.provider_name) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.detection_keywords!.length === 0) {
      alert('Please add at least one detection keyword');
      return;
    }

    setSaving(true);
    const result = templateId
      ? await updateTemplate(templateId, formData)
      : await createTemplate(formData as Omit<EmailTemplatePattern, 'id'>);

    setSaving(false);

    if (result.success) {
      setSaveMessage(result.message);
      setShowSuccessModal(true);
    } else {
      alert(`Error: ${result.message}`);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setFormData({
        ...formData,
        detection_keywords: [...(formData.detection_keywords || []), keywordInput.trim()]
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    const newKeywords = [...(formData.detection_keywords || [])];
    newKeywords.splice(index, 1);
    setFormData({ ...formData, detection_keywords: newKeywords });
  };

  const addTableHeaderKeyword = (keyword: string) => {
    if (!formData.table_header_keywords!.includes(keyword)) {
      setFormData({
        ...formData,
        table_header_keywords: [...(formData.table_header_keywords || []), keyword]
      });
    }
  };

  const removeTableHeaderKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      table_header_keywords: formData.table_header_keywords!.filter(k => k !== keyword)
    });
  };

  const updateColumnMapping = (columnIndex: number, fieldType: string) => {
    const newMapping = { ...formData.column_mapping };
    if (fieldType) {
      newMapping[columnIndex] = fieldType;
    } else {
      delete newMapping[columnIndex];
    }
    setFormData({ ...formData, column_mapping: newMapping });
  };

  const removeColumn = (columnIndex: number) => {
    const newMapping = { ...formData.column_mapping };
    delete newMapping[columnIndex];
    setFormData({ ...formData, column_mapping: newMapping });
  };

  const updateDOMConfig = (field: string, value: DOMFieldConfig | null) => {
    setFormData({
      ...formData,
      dom_config: {
        ...(formData.dom_config || {}),
        [field]: value
      }
    });
  };

  const getDOMConfigValue = (field: string): DOMFieldConfig | null => {
    return formData.dom_config?.[field as keyof typeof formData.dom_config] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading template...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pl-16 lg:pl-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {templateId ? 'Edit Template' : 'Create New Template'}
            </h1>
            <p className="text-gray-600 mt-1">Configure email parsing rules and patterns</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {[
            { id: 'basic', label: 'Basic Info' },
            { id: 'detection', label: 'Detection' },
            { id: 'fields', label: 'Order Fields' },
            { id: 'table', label: 'Line Items' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="e.g., Sysco Order Format"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.provider_name}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="e.g., Sysco Corporation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={formData.platform || ''}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PLATFORM_OPTIONS.map(option => (
                    <option key={option.value || 'universal'} value={option.value || ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select platform for targeted matching, or leave as Universal for fallback
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.template_type}
                  onChange={(e) => setFormData({ ...formData, template_type: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., sysco_v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  disabled={!!templateId}
                />
                {templateId && (
                  <p className="text-xs text-gray-500 mt-1">Template type cannot be changed after creation</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 50 })}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Higher numbers are tried first (0-100)</p>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Active (template is enabled)</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'detection' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detection Keywords <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Add keywords that identify this email template. The system will search for these words in the email content.
              </p>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  placeholder="e.g., order number, delivery address"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.detection_keywords!.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(idx)}
                      className="hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Threshold
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.confidence_threshold}
                  onChange={(e) => setFormData({ ...formData, confidence_threshold: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-lg font-semibold text-gray-900 min-w-[60px]">
                  {formData.confidence_threshold}%
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Minimum percentage of keywords that must match for this template to be selected
              </p>
            </div>
          </div>
        )}

        {activeTab === 'fields' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 mb-1">XPath-Based Parsing</h3>
                <p className="text-xs text-gray-600">All templates use XPath selectors to extract order information from HTML emails.</p>
              </div>

              {templateId ? (
                <button
                  type="button"
                  onClick={() => setShowVisualBuilder(true)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 font-medium shadow-md"
                >
                  <Wand2 className="w-5 h-5" />
                  Open Visual Template Builder
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                  Save the template first to use the Visual Builder
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600">
              Configure XPath selectors to extract order information from HTML email structure. Leave blank to skip extraction.
            </p>

            {/* Basic Order Fields Section */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections({ ...expandedSections, basicFields: !expandedSections.basicFields })}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900">Basic Order Information</h3>
                <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.basicFields ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.basicFields && (
                <div className="p-4 space-y-6">
                  <DOMSelectorInput
                    label="Order Number"
                    value={getDOMConfigValue('orderNumber')}
                    onChange={(value) => updateDOMConfig('orderNumber', value)}
                    helperText="XPath selector for the order number element"
                  />
                  <DOMSelectorInput
                    label="Requester"
                    value={getDOMConfigValue('requester')}
                    onChange={(value) => updateDOMConfig('requester', value)}
                    helperText="XPath selector for requester name"
                  />
                  <DOMSelectorInput
                    label="Supplier Code"
                    value={getDOMConfigValue('supplierCode')}
                    onChange={(value) => updateDOMConfig('supplierCode', value)}
                    helperText="XPath selector for supplier code"
                  />
                  <DOMSelectorInput
                    label="Import Account Number"
                    value={getDOMConfigValue('accountNumber')}
                    onChange={(value) => updateDOMConfig('accountNumber', value)}
                    helperText="XPath selector for import account number"
                  />
                  <DOMSelectorInput
                    label="Currency"
                    value={getDOMConfigValue('currency')}
                    onChange={(value) => updateDOMConfig('currency', value)}
                    helperText="XPath selector for currency code (USD, GBP, EUR, etc.)"
                  />
                  <DOMSelectorInput
                    label="Full Address (Single Block)"
                    value={getDOMConfigValue('fullAddress')}
                    onChange={(value) => updateDOMConfig('fullAddress', value)}
                    helperText="XPath selector for complete address in one block"
                  />
                  <DOMSelectorInput
                    label="Delivery Date / Required Date"
                    value={getDOMConfigValue('requiredDate')}
                    onChange={(value) => updateDOMConfig('requiredDate', value)}
                    helperText="XPath selector for the required date element"
                  />
                  <DOMSelectorInput
                    label="Notes"
                    value={getDOMConfigValue('notes')}
                    onChange={(value) => updateDOMConfig('notes', value)}
                    helperText="XPath selector for order notes"
                  />
                </div>
              )}
            </div>

            {/* Structured Delivery Address Section */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections({ ...expandedSections, deliveryStructured: !expandedSections.deliveryStructured })}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Structured Delivery Address</h3>
                  <p className="text-sm text-gray-600">Extract individual address components for better ERP integration</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.deliveryStructured ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.deliveryStructured && (
                <div className="p-4 space-y-6">
                  <DOMSelectorInput label="Delivery Contact Name" value={getDOMConfigValue('deliveryContact')} onChange={(v) => updateDOMConfig('deliveryContact', v)} helperText="XPath selector for delivery contact name" />
                  <DOMSelectorInput label="Delivery Address Line 1" value={getDOMConfigValue('deliveryAddress1')} onChange={(v) => updateDOMConfig('deliveryAddress1', v)} helperText="XPath selector for delivery address line 1" />
                  <DOMSelectorInput label="Delivery Address Line 2" value={getDOMConfigValue('deliveryAddress2')} onChange={(v) => updateDOMConfig('deliveryAddress2', v)} helperText="XPath selector for delivery address line 2" />
                  <DOMSelectorInput label="Delivery Address Line 3" value={getDOMConfigValue('deliveryAddress3')} onChange={(v) => updateDOMConfig('deliveryAddress3', v)} helperText="XPath selector for delivery address line 3" />
                  <DOMSelectorInput label="Delivery Town/City" value={getDOMConfigValue('deliveryTown')} onChange={(v) => updateDOMConfig('deliveryTown', v)} helperText="XPath selector for delivery town/city" />
                  <DOMSelectorInput label="Delivery County/State" value={getDOMConfigValue('deliveryCounty')} onChange={(v) => updateDOMConfig('deliveryCounty', v)} helperText="XPath selector for delivery county/state" />
                  <DOMSelectorInput label="Delivery Postcode/ZIP" value={getDOMConfigValue('deliveryPostcode')} onChange={(v) => updateDOMConfig('deliveryPostcode', v)} helperText="XPath selector for delivery postcode/ZIP" />
                  <DOMSelectorInput label="Delivery Country" value={getDOMConfigValue('deliveryCountry')} onChange={(v) => updateDOMConfig('deliveryCountry', v)} helperText="XPath selector for delivery country" />
                  <DOMSelectorInput label="Delivery Email" value={getDOMConfigValue('deliveryEmail')} onChange={(v) => updateDOMConfig('deliveryEmail', v)} helperText="XPath selector for delivery email" />
                  <DOMSelectorInput label="Delivery Telephone" value={getDOMConfigValue('deliveryTelephone')} onChange={(v) => updateDOMConfig('deliveryTelephone', v)} helperText="XPath selector for delivery telephone" />
                </div>
              )}
            </div>

            {/* Structured Billing Address Section */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections({ ...expandedSections, billingStructured: !expandedSections.billingStructured })}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Structured Billing Address</h3>
                  <p className="text-sm text-gray-600">Extract individual billing address components</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSections.billingStructured ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.billingStructured && (
                <div className="p-4 space-y-6">
                  <DOMSelectorInput label="Billing Contact Name" value={getDOMConfigValue('billingContact')} onChange={(v) => updateDOMConfig('billingContact', v)} helperText="XPath selector for billing contact name" />
                  <DOMSelectorInput label="Billing Address Line 1" value={getDOMConfigValue('billingAddress1')} onChange={(v) => updateDOMConfig('billingAddress1', v)} helperText="XPath selector for billing address line 1" />
                  <DOMSelectorInput label="Billing Address Line 2" value={getDOMConfigValue('billingAddress2')} onChange={(v) => updateDOMConfig('billingAddress2', v)} helperText="XPath selector for billing address line 2" />
                  <DOMSelectorInput label="Billing Address Line 3" value={getDOMConfigValue('billingAddress3')} onChange={(v) => updateDOMConfig('billingAddress3', v)} helperText="XPath selector for billing address line 3" />
                  <DOMSelectorInput label="Billing Town/City" value={getDOMConfigValue('billingTown')} onChange={(v) => updateDOMConfig('billingTown', v)} helperText="XPath selector for billing town/city" />
                  <DOMSelectorInput label="Billing County/State" value={getDOMConfigValue('billingCounty')} onChange={(v) => updateDOMConfig('billingCounty', v)} helperText="XPath selector for billing county/state" />
                  <DOMSelectorInput label="Billing Postcode/ZIP" value={getDOMConfigValue('billingPostcode')} onChange={(v) => updateDOMConfig('billingPostcode', v)} helperText="XPath selector for billing postcode/ZIP" />
                  <DOMSelectorInput label="Billing Country" value={getDOMConfigValue('billingCountry')} onChange={(v) => updateDOMConfig('billingCountry', v)} helperText="XPath selector for billing country" />
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'table' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">About Line Items Configuration</h3>
              <p className="text-sm text-blue-800">
                This tab configures how to extract product line items (SKU, quantity, price, etc.) from order tables in emails.
                If your emails contain a table with ordered products, configure the table header keywords and column mappings below.
                This is optional if your orders don't have line item tables.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Header Keywords <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Select keywords that mark the start of the line items table
              </p>

              <div className="flex flex-wrap gap-2 mb-3">
                {TABLE_HEADER_KEYWORDS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => addTableHeaderKeyword(option.value)}
                    disabled={formData.table_header_keywords!.includes(option.value)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      formData.table_header_keywords!.includes(option.value)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.table_header_keywords!.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm flex items-center gap-2"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeTableHeaderKeyword(keyword)}
                      className="hover:text-blue-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Column Mapping <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Map each table column to the corresponding order item field
              </p>

              <div className="space-y-3">
                {Array.from({ length: columnCount }).map((_, idx) => (
                  <ColumnMappingRow
                    key={idx}
                    columnIndex={idx}
                    fieldType={formData.column_mapping![idx] || ''}
                    onChange={updateColumnMapping}
                    onRemove={removeColumn}
                    canRemove={idx >= 2}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setColumnCount(columnCount + 1)}
                className="mt-3 flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </button>
            </div>
          </div>
        )}
      </div>

      {showVisualBuilder && templateId && (
        <VisualBuilderModal
          isOpen={showVisualBuilder}
          onClose={() => setShowVisualBuilder(false)}
          templateId={templateId}
          domConfig={visualBuilderConfig}
          onSave={(config) => {
            setVisualBuilderConfig(config);
            // Transform visual builder config to database structure
            const domConfig = visualBuilderToDOMConfig(config);
            setFormData({
              ...formData,
              dom_config: domConfig
            });
            setShowVisualBuilder(false);
          }}
        />
      )}

      <SaveSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onBackToList={onBack}
        templateName={formData.template_name || 'Template'}
        message={saveMessage}
      />
    </div>
  );
}
