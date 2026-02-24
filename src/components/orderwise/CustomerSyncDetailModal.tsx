import { X, User, AlertCircle } from 'lucide-react';
import type { CustomerSyncItem } from '../../hooks/useOrderwiseCustomerSync';

interface CustomerSyncDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CustomerSyncItem | null;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="text-sm font-medium text-slate-700 mb-3 pb-2 border-b border-slate-200">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 mt-0.5">{formatValue(value)}</dd>
    </div>
  );
}

export function CustomerSyncDetailModal({
  isOpen,
  onClose,
  item,
}: CustomerSyncDetailModalProps) {
  if (!isOpen || !item) return null;

  const snapshot = item.customer_snapshot as Record<string, unknown>;

  const actionConfig = {
    created: { label: 'Created', bgColor: 'bg-green-100', textColor: 'text-green-700' },
    updated: { label: 'Updated', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
    skipped: { label: 'Skipped', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  };

  const config = actionConfig[item.action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <User className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {snapshot.name as string || 'Unknown Customer'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500">{item.external_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${config.bgColor} ${config.textColor}`}>
                  {config.label}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {item.error_message && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Skip Reason</p>
                <p className="text-sm text-amber-700 mt-0.5">{item.error_message}</p>
              </div>
            </div>
          )}

          <Section title="Basic Information">
            <Field label="Account Number" value={snapshot.accountNumber} />
            <Field label="Orderwise ID" value={snapshot.id} />
            <Field label="Name" value={snapshot.name} />
            <Field label="Company" value={snapshot.company} />
            <Field label="Email" value={snapshot.email} />
            <Field label="Phone" value={snapshot.phone} />
          </Section>

          <Section title="Billing Address">
            <Field label="Name" value={snapshot.billingName} />
            <Field label="Email" value={snapshot.billingEmail} />
            <Field label="Phone" value={snapshot.billingTelephone} />
            <Field label="Address Line 1" value={snapshot.billingAddress1} />
            <Field label="Address Line 2" value={snapshot.billingAddress2} />
            <Field label="Address Line 3" value={snapshot.billingAddress3} />
            <Field label="Town" value={snapshot.billingTown} />
            <Field label="County" value={snapshot.billingCounty} />
            <Field label="Postcode" value={snapshot.billingPostcode} />
            <Field label="Country" value={snapshot.billingCountry} />
            <Field label="Country Code" value={snapshot.billingCountryCode} />
          </Section>

          <Section title="Shipping Address">
            <Field label="Name" value={snapshot.shippingName} />
            <Field label="Email" value={snapshot.shippingEmail} />
            <Field label="Phone" value={snapshot.shippingTelephone} />
            <Field label="Address Line 1" value={snapshot.shippingAddress1} />
            <Field label="Address Line 2" value={snapshot.shippingAddress2} />
            <Field label="Address Line 3" value={snapshot.shippingAddress3} />
            <Field label="Town" value={snapshot.shippingTown} />
            <Field label="County" value={snapshot.shippingCounty} />
            <Field label="Postcode" value={snapshot.shippingPostcode} />
            <Field label="Country" value={snapshot.shippingCountry} />
            <Field label="Country Code" value={snapshot.shippingCountryCode} />
          </Section>

          <Section title="Account Details">
            <Field label="On Hold" value={snapshot.onHold} />
            <Field label="Manual On Hold" value={snapshot.manualOnHold} />
            <Field label="Balance" value={snapshot.balance} />
            <Field label="Credit Limit" value={snapshot.creditLimit} />
            <Field label="Available to Spend" value={snapshot.availableToSpend} />
            <Field label="Open Orders Value" value={snapshot.openOrdersValue} />
            <Field label="Over Credit Terms" value={snapshot.overCreditTerms} />
            <Field label="VAT Number" value={snapshot.vatNumber} />
          </Section>

          <Section title="Settings">
            <Field label="Currency ID" value={snapshot.currencyId} />
            <Field label="Price List ID" value={snapshot.priceListId} />
            <Field label="Nominal Code ID" value={snapshot.nominalCodeId} />
            <Field label="Default Tax Code ID" value={snapshot.defaultTaxCodeId} />
            <Field label="Last Amended" value={snapshot.lastAmendedDateTime} />
          </Section>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">
              Synced at: {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
