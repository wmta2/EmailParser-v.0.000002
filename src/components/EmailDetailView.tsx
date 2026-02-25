import { useState, useEffect } from 'react';
import { useEmailDetail, type ParsedOrderData, type DetectionResult } from '../hooks/useEmailDetail';
import { useCustomerMatch, type MatchMethod, type CustomerMatchCriteria } from '../hooks/useCustomerMatch';
import { OrderExportPanel } from './OrderExportPanel';
import { OrderItemsTable } from './OrderItemsTable';
import { EditableTextField, EditableTextArea, EditableDateField, EditableNumberField } from './EditableField';
import { CustomerMatchPanel } from './CustomerMatchPanel';
import type { Order, OrderItem, Customer } from '../lib/supabase';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  Package,
  MapPin,
  Eye,
  Save,
  X,
  Clock,
  Mail,
  FileText,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { ORDER_PARSING_STATUS_CONFIG as STATUS_CONFIG } from '../lib/statusConfig';

function formatSubjectForDisplay(subject: string | null): string {
  if (!subject) return 'No Subject';

  // Apply text replacements for display (case-insensitive)
  let formatted = subject;
  formatted = formatted.replace(/ROSA S LONDON LTD/gi, 'ROSA');
  formatted = formatted.replace(/PHO TRADING LTD -/gi, 'PHO -');
  formatted = formatted.replace(/PATARA FINE THAI CUISINE/gi, 'PATARA -');

  return formatted;
}

interface EmailDetailViewProps {
  emailId: number;
  onClose: () => void;
}

export function EmailDetailView({ emailId, onClose }: EmailDetailViewProps) {
  const { email, order, items, customer, latestFailedExport, loading, error, previewParseEmail, savePreviewedData, confirmOrder, refetchOrder, setItems } = useEmailDetail(emailId);
  const { searchCustomers } = useCustomerMatch();
  const [previewMode, setPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedOrderData | null>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showRawEmail, setShowRawEmail] = useState(true);

  const [editedOrder, setEditedOrder] = useState<Partial<Order> | null>(null);
  const [editedItems, setEditedItems] = useState<Partial<OrderItem>[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!loading && email && !order && !previewMode) {
      handlePreviewParse();
    }
  }, [loading, email, order]);

  useEffect(() => {
    if (previewMode && !previewData && detection) {
      setShowRawEmail(true);
    }
  }, [previewMode, previewData, detection]);

  useEffect(() => {
    if (order?.parsing_status === 'failed') {
      setShowRawEmail(true);
    }
  }, [order?.parsing_status]);

  async function handlePreviewParse() {
    setParsing(true);
    try {
      const result = await previewParseEmail();
      if (result && result.parsedData) {
        setPreviewData(result.parsedData);
        const orderWithCustomer = result.suggestedCustomer
          ? {
              ...result.parsedData.order,
              account_number: result.parsedData.order.account_number || result.suggestedCustomer.account_number || '',
              supplier_code: result.parsedData.order.supplier_code || result.suggestedCustomer.external_id || '',
            }
          : result.parsedData.order;
        setEditedOrder(orderWithCustomer);
        setEditedItems(result.parsedData.items);
        setDetection(result.detection);
        if (result.suggestedCustomer) {
          setSelectedCustomerId(result.suggestedCustomer.id);
          setSelectedCustomer(result.suggestedCustomer);
        }
        setPreviewMode(true);
      } else if (result && !result.parsedData) {
        setDetection(result.detection);
        setPreviewMode(true);
      }
    } catch (err) {
      console.error('Preview parse error:', err);
    } finally {
      setParsing(false);
    }
  }

  async function handleAcceptPreview() {
    if (!editedOrder || !editedItems) return;

    setSaving(true);
    try {
      const dataToSave: ParsedOrderData = {
        order: editedOrder as Order,
        items: editedItems as OrderItem[]
      };
      const result = await savePreviewedData(dataToSave, selectedCustomerId);
      if (result.success) {
        setPreviewMode(false);
        setPreviewData(null);
        setEditedOrder(null);
        setEditedItems([]);
        setDetection(null);
        setSelectedCustomerId(null);
        setSelectedCustomer(null);
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmOrder() {
    setConfirming(true);
    try {
      await confirmOrder();
    } catch (err) {
      console.error('Confirm error:', err);
    } finally {
      setConfirming(false);
    }
  }

  function handleRejectPreview() {
    setPreviewMode(false);
    setPreviewData(null);
    setEditedOrder(null);
    setEditedItems([]);
    setDetection(null);
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
  }

  function updateOrderField(field: keyof Order, value: string | number) {
    if (editedOrder) {
      setEditedOrder({ ...editedOrder, [field]: value });
    }
  }

  function handleSelectCustomer(customer: Customer | null, _method: MatchMethod) {
    setSelectedCustomerId(customer?.id ?? null);
    setSelectedCustomer(customer);
    if (customer && editedOrder) {
      setEditedOrder({
        ...editedOrder,
        account_number: editedOrder.account_number || customer.account_number || '',
        supplier_code: editedOrder.supplier_code || customer.external_id || '',
      });
    }
  }

  function handleItemsChange(updatedItems: OrderItem[]) {
    setItems(updatedItems);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="text-center py-20">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-slate-600">{error || 'Email not found'}</p>
        <button onClick={onClose} className="mt-4 text-blue-600 hover:underline">Go back</button>
      </div>
    );
  }

  const owExportStatusConfig = order?.ow_export_status === 'exported'
    ? { label: 'Exported to Orderwise', color: 'bg-blue-100 text-blue-700', icon: CheckCircle }
    : order?.ow_export_status === 'export_failed'
    ? { label: 'Export Failed', color: 'bg-orange-100 text-orange-700', icon: XCircle }
    : null;

  const statusConfig = order ? STATUS_CONFIG[order.parsing_status] || STATUS_CONFIG.pending : null;
  const StatusIcon = statusConfig?.icon;

  const displayItems = previewMode && editedItems.length > 0 ? editedItems : items;
  const displayOrder = previewMode && editedOrder ? editedOrder : order;

  const showCustomerMatch = previewMode && previewData;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pl-16 lg:pl-0">
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-slate-600" />
            <h2 className="text-2xl font-bold text-slate-900">
              {order ? `Order #${order.order_number || 'N/A'}` : 'Email Order'}
            </h2>
            {statusConfig && StatusIcon && !owExportStatusConfig && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig.label}
              </span>
            )}
            {owExportStatusConfig && (() => {
              const ExportIcon = owExportStatusConfig.icon;
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium ${owExportStatusConfig.color}`}>
                  <ExportIcon className="w-4 h-4" />
                  {owExportStatusConfig.label}
                </span>
              );
            })()}
            {previewMode && detection && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700">
                <Eye className="w-4 h-4" />
                Preview Mode
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Email from {email.from_email} on {new Date(email.date_received || email.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {parsing && !previewMode && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-slate-600 animate-spin" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Parsing Email...</h3>
              <p className="text-xs text-slate-600">Detecting template and extracting order data</p>
            </div>
          </div>
        </div>
      )}

      {previewMode && !previewData && detection && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">Parsing Failed</h3>
              <p className="text-xs text-red-800 mb-3">
                {detection.templateType === 'unknown'
                  ? `Unable to detect a known template for this email. Confidence: ${Math.round(detection.confidence * 100)}%`
                  : `Failed to extract order data using template: ${detection.templateType} (${Math.round(detection.confidence * 100)}% confidence)`}
              </p>
              <button
                onClick={handleRejectPreview}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {previewMode && previewData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Preview Mode - Data Not Saved
                {detection && (
                  <span className="ml-2 text-xs font-normal">
                    (Template: {detection.templateType} - {Math.round(detection.confidence * 100)}% confidence)
                  </span>
                )}
              </h3>
              <p className="text-xs text-blue-800 mb-3">
                Review the parsed data below. Accept to save it to the database, or cancel to discard.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleAcceptPreview}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Accept & Save</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleRejectPreview}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!previewMode && order?.parsing_status === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 mb-1">Pending Review</h3>
              <p className="text-xs text-amber-800 mb-3">
                This order has been parsed and is awaiting review. Confirm it to mark it as ready for ERP export, or re-parse to review and edit the extracted data.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleConfirmOrder}
                  disabled={confirming}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {confirming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm Order</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handlePreviewParse}
                  disabled={confirming || parsing}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" />
                  <span>Re-parse & Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {previewMode && !previewData && detection && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowRawEmail(!showRawEmail)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Email Preview 1</h3>
                </div>
                {showRawEmail ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
              </button>
              {showRawEmail && (
                <div className="px-6 pb-6">
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subject</span>
                      <span className="text-slate-900 font-medium">{formatSubjectForDisplay(email.subject)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">From</span>
                      <span className="text-slate-900">{email.from_email || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Received</span>
                      <span className="text-slate-900">
                        {new Date(email.date_received || email.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    {email.html_body ? (
                      <iframe
                        srcDoc={email.html_body}
                        sandbox="allow-same-origin"
                        className="w-full min-h-[400px] max-h-[600px]"
                        title="Email content"
                      />
                    ) : (
                      <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap">
                        {email.content || 'No content available'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {displayOrder && displayItems.length > 0 ? (
            <>
              <div>
                <OrderItemsTable
                  items={previewMode ? (displayItems as OrderItem[]) : items}
                  latestErrorResponse={latestFailedExport?.response_payload}
                  onItemsChange={handleItemsChange}
                  disabled={previewMode}
                  isPreviewMode={previewMode}
                  isExported={order?.ow_export_status === 'exported'}
                />
                <div className="px-6 py-4 bg-slate-50 border border-t-0 border-slate-200 rounded-b-xl -mt-3">
                  <div className="flex justify-end gap-8 text-sm">
                    <div className="text-slate-900 font-semibold text-base">
                      Total: £{displayItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowRawEmail(!showRawEmail)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Email Preview 2</h3>
                  </div>
                  {showRawEmail ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {showRawEmail && (
                  <div className="px-6 pb-6">
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subject</span>
                        <span className="text-slate-900 font-medium">{formatSubjectForDisplay(email.subject)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">From</span>
                        <span className="text-slate-900">{email.from_email || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Received</span>
                        <span className="text-slate-900">
                          {new Date(email.date_received || email.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      {email.html_body ? (
                        <iframe
                          srcDoc={email.html_body}
                          sandbox="allow-same-origin"
                          className="w-full min-h-[400px] max-h-[600px]"
                          title="Email content"
                        />
                      ) : (
                        <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap">
                          {email.content || 'No content available'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : !previewMode && !order ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Not Parsed Yet</h3>
              <p className="text-slate-600">
                This email has not been parsed. Click the "Preview Parse" button to extract and review order data.
              </p>
            </div>
          ) : order?.parsing_status === 'failed' ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Parsing Failed</h3>
                <p className="text-slate-600 mb-4">{order.parsing_error}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowRawEmail(!showRawEmail)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Email Preview 3</h3>
                  </div>
                  {showRawEmail ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>
                {showRawEmail && (
                  <div className="px-6 pb-6">
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subject</span>
                        <span className="text-slate-900 font-medium">{formatSubjectForDisplay(email.subject)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">From</span>
                        <span className="text-slate-900">{email.from_email || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Received</span>
                        <span className="text-slate-900">
                          {new Date(email.date_received || email.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      {email.html_body ? (
                        <iframe
                          srcDoc={email.html_body}
                          sandbox="allow-same-origin"
                          className="w-full min-h-[400px] max-h-[600px]"
                          title="Email content"
                        />
                      ) : (
                        <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap">
                          {email.content || 'No content available'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          {order && items.length > 0 && !previewMode && (
            <OrderExportPanel order={order} items={items} customer={customer} onExported={refetchOrder} />
          )}

          {displayOrder && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Order Information</h3>
                </div>
                <div className="space-y-4">
                  {email.from_email && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Customer Email</p>
                      <p className="text-sm text-slate-900 break-all">{email.from_email}</p>
                    </div>
                  )}

                  {showCustomerMatch && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Matched Customer</p>
                      <CustomerMatchPanel
                        criteria={{
                          accountNumber: editedOrder?.account_number,
                          supplierCode: editedOrder?.supplier_code,
                          deliveryPostcode: editedOrder?.delivery_postcode,
                          billingPostcode: editedOrder?.billing_postcode,
                          requester: editedOrder?.requester,
                          deliveryName: editedOrder?.delivery_name,
                        }}
                        selectedCustomerId={selectedCustomerId}
                        onSelectCustomer={handleSelectCustomer}
                        searchCustomers={searchCustomers}
                      />
                    </div>
                  )}

                  <EditableTextField
                    label="Order Number"
                    value={displayOrder.order_number || ''}
                    onChange={(value) => updateOrderField('order_number', value)}
                    editable={previewMode}
                    placeholder="Enter order number"
                    required
                  />
                  <EditableTextField
                    label="Requester"
                    value={displayOrder.requester || ''}
                    onChange={(value) => updateOrderField('requester', value)}
                    editable={previewMode}
                    placeholder="Enter requester name"
                  />
                  {(displayOrder.supplier_code || previewMode) && (
                    <EditableTextField
                      label="Supplier Code"
                      value={displayOrder.supplier_code || ''}
                      onChange={(value) => updateOrderField('supplier_code', value)}
                      editable={previewMode}
                      placeholder="Enter supplier code"
                    />
                  )}
                  {(displayOrder.account_number || previewMode) && (
                    <EditableTextField
                      label="Import Account Number"
                      value={displayOrder.account_number || ''}
                      onChange={(value) => updateOrderField('account_number', value)}
                      editable={previewMode}
                      placeholder="Enter account number"
                    />
                  )}
                  {(displayOrder.currency || previewMode) && (
                    <EditableTextField
                      label="Currency"
                      value={displayOrder.currency || ''}
                      onChange={(value) => updateOrderField('currency', value)}
                      editable={previewMode}
                      placeholder="e.g., USD, GBP, EUR"
                    />
                  )}
                  {(displayOrder.full_address || previewMode) && (
                    <EditableTextArea
                      label="Full Address (Single Block)"
                      value={displayOrder.full_address || ''}
                      onChange={(value) => updateOrderField('full_address', value)}
                      editable={previewMode}
                      placeholder="Complete address in single field"
                      rows={3}
                    />
                  )}
                  {(displayOrder.required_date || previewMode) && (
                    <EditableDateField
                      label="Required Date"
                      value={displayOrder.required_date || ''}
                      onChange={(value) => updateOrderField('required_date', value)}
                      editable={previewMode}
                    />
                  )}
                  {(displayOrder.notes || previewMode) && (
                    <EditableTextArea
                      label="Order Notes"
                      value={displayOrder.notes || ''}
                      onChange={(value) => updateOrderField('notes', value)}
                      editable={previewMode}
                      placeholder="Add any additional notes or special instructions"
                      rows={4}
                    />
                  )}
                </div>
              </div>

              {(displayOrder.order_total !== undefined || previewMode) && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Financial Details</h3>
                  </div>
                  <div className="space-y-4">
                    {displayOrder.order_total !== undefined && (
                      <EditableNumberField
                        label="Order Total"
                        value={displayOrder.order_total || 0}
                        onChange={(value) => updateOrderField('order_total', value)}
                        editable={previewMode}
                        prefix="£"
                      />
                    )}
                    {displayOrder.shipping_total !== undefined && (
                      <EditableNumberField
                        label="Shipping Total"
                        value={displayOrder.shipping_total || 0}
                        onChange={(value) => updateOrderField('shipping_total', value)}
                        editable={previewMode}
                        prefix="£"
                      />
                    )}
                    {displayOrder.tax_total !== undefined && (
                      <EditableNumberField
                        label="Tax Total"
                        value={displayOrder.tax_total || 0}
                        onChange={(value) => updateOrderField('tax_total', value)}
                        editable={previewMode}
                        prefix="£"
                      />
                    )}
                    {displayOrder.discount_total !== undefined && (
                      <EditableNumberField
                        label="Discount Total"
                        value={displayOrder.discount_total || 0}
                        onChange={(value) => updateOrderField('discount_total', value)}
                        editable={previewMode}
                        prefix="£"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Delivery Address</h3>
                </div>
                <div className="space-y-4">
                  <EditableTextField
                    label="Name"
                    value={displayOrder.delivery_name || ''}
                    onChange={(value) => updateOrderField('delivery_name', value)}
                    editable={previewMode}
                    placeholder="Recipient name"
                  />
                  <EditableTextField
                    label="Address Line 1"
                    value={displayOrder.delivery_address1 || ''}
                    onChange={(value) => updateOrderField('delivery_address1', value)}
                    editable={previewMode}
                    placeholder="Street address"
                  />
                  {(displayOrder.delivery_address2 || previewMode) && (
                    <EditableTextField
                      label="Address Line 2"
                      value={displayOrder.delivery_address2 || ''}
                      onChange={(value) => updateOrderField('delivery_address2', value)}
                      editable={previewMode}
                      placeholder="Apartment, suite, etc."
                    />
                  )}
                  {(displayOrder.delivery_address3 || previewMode) && (
                    <EditableTextField
                      label="Address Line 3"
                      value={displayOrder.delivery_address3 || ''}
                      onChange={(value) => updateOrderField('delivery_address3', value)}
                      editable={previewMode}
                      placeholder="Additional address info"
                    />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <EditableTextField
                      label="Town/City"
                      value={displayOrder.delivery_town || ''}
                      onChange={(value) => updateOrderField('delivery_town', value)}
                      editable={previewMode}
                      placeholder="City"
                    />
                    <EditableTextField
                      label="County/State"
                      value={displayOrder.delivery_county || ''}
                      onChange={(value) => updateOrderField('delivery_county', value)}
                      editable={previewMode}
                      placeholder="State"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <EditableTextField
                      label="Postcode"
                      value={displayOrder.delivery_postcode || ''}
                      onChange={(value) => updateOrderField('delivery_postcode', value)}
                      editable={previewMode}
                      placeholder="ZIP/Postal code"
                    />
                    <EditableTextField
                      label="Country"
                      value={displayOrder.delivery_country || ''}
                      onChange={(value) => updateOrderField('delivery_country', value)}
                      editable={previewMode}
                      placeholder="Country"
                    />
                  </div>
                  {(displayOrder.delivery_email || previewMode) && (
                    <EditableTextField
                      label="Email"
                      value={displayOrder.delivery_email || ''}
                      onChange={(value) => updateOrderField('delivery_email', value)}
                      editable={previewMode}
                      placeholder="email@example.com"
                      type="email"
                    />
                  )}
                  {(displayOrder.delivery_telephone || previewMode) && (
                    <EditableTextField
                      label="Telephone"
                      value={displayOrder.delivery_telephone || ''}
                      onChange={(value) => updateOrderField('delivery_telephone', value)}
                      editable={previewMode}
                      placeholder="Phone number"
                      type="tel"
                    />
                  )}
                  {(displayOrder.delivery_mobile || previewMode) && (
                    <EditableTextField
                      label="Mobile"
                      value={displayOrder.delivery_mobile || ''}
                      onChange={(value) => updateOrderField('delivery_mobile', value)}
                      editable={previewMode}
                      placeholder="Mobile number"
                      type="tel"
                    />
                  )}
                </div>
              </div>

              {(displayOrder.billing_name || displayOrder.billing_address1 || previewMode) && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Billing Address</h3>
                  </div>
                  <div className="space-y-4">
                    <EditableTextField
                      label="Name"
                      value={displayOrder.billing_name || ''}
                      onChange={(value) => updateOrderField('billing_name', value)}
                      editable={previewMode}
                      placeholder="Billing name"
                    />
                    <EditableTextField
                      label="Address Line 1"
                      value={displayOrder.billing_address1 || ''}
                      onChange={(value) => updateOrderField('billing_address1', value)}
                      editable={previewMode}
                      placeholder="Street address"
                    />
                    {(displayOrder.billing_address2 || previewMode) && (
                      <EditableTextField
                        label="Address Line 2"
                        value={displayOrder.billing_address2 || ''}
                        onChange={(value) => updateOrderField('billing_address2', value)}
                        editable={previewMode}
                        placeholder="Apartment, suite, etc."
                      />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <EditableTextField
                        label="Town/City"
                        value={displayOrder.billing_town || ''}
                        onChange={(value) => updateOrderField('billing_town', value)}
                        editable={previewMode}
                        placeholder="City"
                      />
                      <EditableTextField
                        label="County/State"
                        value={displayOrder.billing_county || ''}
                        onChange={(value) => updateOrderField('billing_county', value)}
                        editable={previewMode}
                        placeholder="State"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <EditableTextField
                        label="Postcode"
                        value={displayOrder.billing_postcode || ''}
                        onChange={(value) => updateOrderField('billing_postcode', value)}
                        editable={previewMode}
                        placeholder="ZIP/Postal code"
                      />
                      <EditableTextField
                        label="Country"
                        value={displayOrder.billing_country || ''}
                        onChange={(value) => updateOrderField('billing_country', value)}
                        editable={previewMode}
                        placeholder="Country"
                      />
                    </div>
                    {(displayOrder.billing_email || previewMode) && (
                      <EditableTextField
                        label="Email"
                        value={displayOrder.billing_email || ''}
                        onChange={(value) => updateOrderField('billing_email', value)}
                        editable={previewMode}
                        placeholder="email@example.com"
                        type="email"
                      />
                    )}
                    {(displayOrder.billing_telephone || previewMode) && (
                      <EditableTextField
                        label="Telephone"
                        value={displayOrder.billing_telephone || ''}
                        onChange={(value) => updateOrderField('billing_telephone', value)}
                        editable={previewMode}
                        placeholder="Phone number"
                        type="tel"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Details</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source</span>
                    <span className="text-slate-900 font-medium">Email</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Number</span>
                    <span className="text-slate-900 font-mono text-xs">{displayOrder.order_number || '-'}</span>
                  </div>
                  {order && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Template</span>
                        <span className="text-slate-900">{order.template_type || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Created</span>
                        <span className="text-slate-900">{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
