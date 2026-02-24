import { useState } from 'react';
import {
  RefreshCw,
  List,
  XCircle,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { ValueListItem } from '../../lib/erp/types';
import { ORDERWISE_VALUE_LISTS } from '../../lib/constants';

interface ValueListSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  listId: number;
  placeholder: string;
  description: string;
  valueLists: Record<number, ValueListItem[]>;
  loadingLists: Record<number, boolean>;
  fetchValueList: (id: number) => void;
  hasCredentials: boolean;
}

function ValueListSelect({
  label, value, onChange, listId, placeholder, description,
  valueLists, loadingLists, fetchValueList, hasCredentials,
}: ValueListSelectProps) {
  const items = valueLists[listId];
  const isLoading = loadingLists[listId];
  const [showError, setShowError] = useState(false);

  const handleFetch = async () => {
    setShowError(false);
    try {
      await fetchValueList(listId);
    } catch {
      setShowError(true);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2">
        {items && items.length > 0 ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm bg-white"
          >
            <option value="">-- Not set --</option>
            {items.map(item => (
              <option key={item.id} value={String(item.id)}>
                {item.name} (ID: {item.id})
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
          />
        )}
        {hasCredentials && (
          <button
            onClick={handleFetch}
            disabled={isLoading}
            className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Load options from Orderwise (requires Value lists GET permission)"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <List className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
      {showError && (
        <p className="text-xs text-red-600 mt-1">
          Failed to load options. Check that your API user group has GET permission for "Value lists".
        </p>
      )}
    </div>
  );
}

interface MappingSectionProps {
  systemOrderType: string;
  setSystemOrderType: (v: string) => void;
  orderTypeId: string;
  setOrderTypeId: (v: string) => void;
  deliveryMethodId: string;
  setDeliveryMethodId: (v: string) => void;
  taxRateId: string;
  setTaxRateId: (v: string) => void;
  stockLocationId: string;
  setStockLocationId: (v: string) => void;
  currencyId: string;
  setCurrencyId: (v: string) => void;
  paymentMethodId: string;
  setPaymentMethodId: (v: string) => void;
  pricesAsNet: boolean;
  setPricesAsNet: (v: boolean) => void;
  valueLists: Record<number, ValueListItem[]>;
  loadingLists: Record<number, boolean>;
  fetchValueList: (id: number) => void;
  hasCredentials: boolean;
}

export function MappingSection({
  systemOrderType, setSystemOrderType,
  orderTypeId, setOrderTypeId,
  deliveryMethodId, setDeliveryMethodId,
  taxRateId, setTaxRateId,
  stockLocationId, setStockLocationId,
  currencyId, setCurrencyId,
  paymentMethodId, setPaymentMethodId,
  pricesAsNet, setPricesAsNet,
  valueLists, loadingLists, fetchValueList, hasCredentials,
}: MappingSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [showPermissionsHelp, setShowPermissionsHelp] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
      >
        <h3 className="font-semibold text-slate-900">Field Mapping Defaults</h3>
        {expanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">API Permissions Required</p>
                <p className="text-xs text-blue-800 mb-2">
                  To use these features, your Orderwise API user group needs the following permissions:
                </p>
                <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                  <li><strong>Value lists:</strong> GET (required to load dropdown options)</li>
                  <li><strong>Sales orders:</strong> GET, POST, PUT (required to create/update orders)</li>
                  <li><strong>Stock:</strong> GET, POST (recommended for inventory checks)</li>
                  <li><strong>Customers:</strong> GET (recommended for customer lookups)</li>
                </ul>
                <button
                  onClick={() => setShowPermissionsHelp(true)}
                  className="text-xs text-blue-700 hover:text-blue-900 font-medium mt-2 underline"
                >
                  View detailed permission mapping
                </button>
              </div>
            </div>
          </div>

          {showPermissionsHelp && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 max-w-2xl mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-slate-900">Orderwise API Permissions Guide</h4>
                  <button
                    onClick={() => setShowPermissionsHelp(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4 text-sm text-slate-700">
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">Required Permissions</h5>
                    <div className="space-y-3">
                      <div className="border-l-4 border-blue-500 pl-3">
                        <p className="font-medium">Value lists: GET</p>
                        <p className="text-xs text-slate-600">Allows loading dropdown options for all field mappings (Order Type, Delivery Method, Tax Rate, Stock Location, Currency, Payment Method)</p>
                      </div>
                      <div className="border-l-4 border-green-500 pl-3">
                        <p className="font-medium">Sales orders: GET, POST, PUT</p>
                        <p className="text-xs text-slate-600">Required to create new orders and update existing ones in Orderwise</p>
                      </div>
                      <div className="border-l-4 border-amber-500 pl-3">
                        <p className="font-medium">Stock: GET, POST</p>
                        <p className="text-xs text-slate-600">Recommended for verifying product availability before order creation</p>
                      </div>
                      <div className="border-l-4 border-slate-400 pl-3">
                        <p className="font-medium">Customers: GET</p>
                        <p className="text-xs text-slate-600">Recommended for customer lookups and verification</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded">
                    <p className="font-medium text-slate-900 mb-1">How to configure permissions:</p>
                    <ol className="text-xs text-slate-700 space-y-1 ml-4 list-decimal">
                      <li>Log in to Orderwise and navigate to System → Settings</li>
                      <li>Go to API User Groups and select your API user group</li>
                      <li>Enable the required permissions as listed above</li>
                      <li>Save changes and test the connection</li>
                    </ol>
                  </div>

                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <p className="font-medium text-red-900 mb-1">Common Error: 403 Forbidden</p>
                    <p className="text-xs text-red-800">
                      If you receive a 403 error when loading value lists or creating orders, check that your API user group has the required GET permission for that specific category.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPermissionsHelp(false)}
                  className="mt-6 w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Set default Orderwise IDs for order fields. Click the list icon to load options from your Orderwise instance.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">System Order Type</label>
            <select
              value={systemOrderType}
              onChange={(e) => setSystemOrderType(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm bg-white"
            >
              <option value="1">1 - Order</option>
              <option value="2">2 - Quote</option>
              <option value="3">3 - Paused</option>
              <option value="4">4 - Credit</option>
              <option value="5">5 - Schedule</option>
              <option value="6">6 - Bulk Order</option>
            </select>
          </div>

          <ValueListSelect
            label="Order Type"
            value={orderTypeId}
            onChange={setOrderTypeId}
            listId={ORDERWISE_VALUE_LISTS.ORDER_TYPE}
            placeholder={`From value-lists/${ORDERWISE_VALUE_LISTS.ORDER_TYPE}`}
            description={`Order type classification (value-lists/${ORDERWISE_VALUE_LISTS.ORDER_TYPE})`}
            valueLists={valueLists}
            loadingLists={loadingLists}
            fetchValueList={fetchValueList}
            hasCredentials={hasCredentials}
          />

          <ValueListSelect
            label="Delivery Method"
            value={deliveryMethodId}
            onChange={setDeliveryMethodId}
            listId={ORDERWISE_VALUE_LISTS.DELIVERY_METHOD}
            placeholder={`From value-lists/${ORDERWISE_VALUE_LISTS.DELIVERY_METHOD}`}
            description={`Default delivery method (value-lists/${ORDERWISE_VALUE_LISTS.DELIVERY_METHOD})`}
            valueLists={valueLists}
            loadingLists={loadingLists}
            fetchValueList={fetchValueList}
            hasCredentials={hasCredentials}
          />

          <ValueListSelect
            label="Tax Rate"
            value={taxRateId}
            onChange={setTaxRateId}
            listId={ORDERWISE_VALUE_LISTS.TAX_RATE}
            placeholder={`From value-lists/${ORDERWISE_VALUE_LISTS.TAX_RATE}`}
            description={`Default tax code applied to order lines (value-lists/${ORDERWISE_VALUE_LISTS.TAX_RATE})`}
            valueLists={valueLists}
            loadingLists={loadingLists}
            fetchValueList={fetchValueList}
            hasCredentials={hasCredentials}
          />

          <ValueListSelect
            label="Stock Location"
            value={stockLocationId}
            onChange={setStockLocationId}
            listId={ORDERWISE_VALUE_LISTS.STOCK_LOCATION}
            placeholder={`From value-lists/${ORDERWISE_VALUE_LISTS.STOCK_LOCATION}`}
            description={`Default stock location for orders (value-lists/${ORDERWISE_VALUE_LISTS.STOCK_LOCATION})`}
            valueLists={valueLists}
            loadingLists={loadingLists}
            fetchValueList={fetchValueList}
            hasCredentials={hasCredentials}
          />

          <ValueListSelect
            label="Currency"
            value={currencyId}
            onChange={setCurrencyId}
            listId={ORDERWISE_VALUE_LISTS.CURRENCY}
            placeholder={`From value-lists/${ORDERWISE_VALUE_LISTS.CURRENCY}`}
            description={`Default currency (value-lists/${ORDERWISE_VALUE_LISTS.CURRENCY})`}
            valueLists={valueLists}
            loadingLists={loadingLists}
            fetchValueList={fetchValueList}
            hasCredentials={hasCredentials}
          />

          <ValueListSelect
            label="Payment Method"
            value={paymentMethodId}
            onChange={setPaymentMethodId}
            listId={ORDERWISE_VALUE_LISTS.PAYMENT_METHOD}
            placeholder={`From value-lists/${ORDERWISE_VALUE_LISTS.PAYMENT_METHOD}`}
            description={`Default payment method for imported orders (value-lists/${ORDERWISE_VALUE_LISTS.PAYMENT_METHOD})`}
            valueLists={valueLists}
            loadingLists={loadingLists}
            fetchValueList={fetchValueList}
            hasCredentials={hasCredentials}
          />

          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Prices as Net</label>
              <p className="text-xs text-slate-500">Send prices excluding tax</p>
            </div>
            <button
              onClick={() => setPricesAsNet(!pricesAsNet)}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              {pricesAsNet ? (
                <ToggleRight className="w-8 h-8 text-blue-600" />
              ) : (
                <ToggleLeft className="w-8 h-8" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
