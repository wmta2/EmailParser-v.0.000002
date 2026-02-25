import { useState } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { supabase, type OrderItem } from '../lib/supabase';
import { parseFailedVariantCodes, isItemFailed, type FailedVariant } from '../lib/errorParser';
import { isValidProductCode } from '../lib/textSanitizer';

interface Props {
  items: OrderItem[];
  latestErrorResponse?: Record<string, unknown> | null;
  onItemsChange?: (items: OrderItem[]) => void;
  disabled?: boolean;
  isPreviewMode?: boolean;
  isExported?: boolean;
}

export function OrderItemsTable({ items, latestErrorResponse, onItemsChange, disabled = false, isPreviewMode = false, isExported = false }: Props) {
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const failedVariants = parseFailedVariantCodes(latestErrorResponse ?? null);
  const exportableCount = items.filter(i => i.export_to_erp).length;

  function hasInvalidCode(item: OrderItem): boolean {
    const code = item.sku || item.product_code;
    return !code || !isValidProductCode(code);
  }

  const invalidItemsCount = items.filter(i => i.export_to_erp && hasInvalidCode(i)).length;

  async function handleToggleExport(item: OrderItem) {
    const newValue = !item.export_to_erp;
    setUpdatingItems(prev => new Set(prev).add(item.id));

    const { error } = await supabase
      .from('order_items')
      .update({ export_to_erp: newValue })
      .eq('id', item.id);

    setUpdatingItems(prev => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });

    if (!error && onItemsChange) {
      const updatedItems = items.map(i =>
        i.id === item.id ? { ...i, export_to_erp: newValue } : i
      );
      onItemsChange(updatedItems);
    }
  }

  const hideExportColumn = isPreviewMode || isExported;

  function getRowClasses(item: OrderItem, failedVariants: FailedVariant[]): string {
    const isExcluded = !item.export_to_erp;

    if (isExported && isExcluded) {
      return 'bg-amber-50 border-l-4 border-l-amber-400';
    }
    if (isPreviewMode) {
      return 'hover:bg-slate-50';
    }
    const isFailed = isItemFailed(item.sku || item.product_code, failedVariants);
    const isInvalid = hasInvalidCode(item);

    // Highlight invalid codes or failed exports in red (prioritize if not excluded)
    if ((isInvalid || isFailed) && !isExcluded) {
      return 'bg-red-50 border-l-4 border-l-red-400';
    }
    if (isExcluded) {
      return 'bg-slate-50 opacity-60';
    }
    return 'hover:bg-slate-50';
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Order Items</h3>
          <span className="text-sm text-slate-500">
            ({exportableCount} of {items.length} selected for export)
          </span>
        </div>
        {(failedVariants.length > 0 || invalidItemsCount > 0) && (
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>
              {invalidItemsCount > 0 && `${invalidItemsCount} invalid code(s)`}
              {invalidItemsCount > 0 && failedVariants.length > 0 && ', '}
              {failedVariants.length > 0 && `${failedVariants.length} failed export(s)`}
            </span>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-slate-500">No items found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {!hideExportColumn && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-12">
                    Export
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  SKU
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Tax
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map(item => {
                const isFailed = isItemFailed(item.sku || item.product_code, failedVariants);
                const isInvalid = hasInvalidCode(item);
                const isUpdating = updatingItems.has(item.id);

                return (
                  <tr key={item.id} className={getRowClasses(item, failedVariants)}>
                    {!hideExportColumn && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center relative group">
                          <input
                            type="checkbox"
                            checked={item.export_to_erp}
                            onChange={() => handleToggleExport(item)}
                            disabled={isUpdating || disabled}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          {disabled && (
                            <div className="absolute left-full ml-2 hidden group-hover:block z-10">
                              <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                Save order first to enable selection
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isExported && !item.export_to_erp ? 'text-amber-700' : (hideExportColumn || item.export_to_erp ? 'text-slate-900' : 'text-slate-500 line-through')}`}>
                          {item.product_name}
                        </span>
                        {isExported && !item.export_to_erp && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            Not exported
                          </span>
                        )}
                        {(isInvalid || isFailed) && item.export_to_erp && (
                          <div className="group relative">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                              <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                {isInvalid ? 'Invalid or missing product code - will fail export' : 'This item failed during the last export attempt'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-mono ${(isInvalid || isFailed) && item.export_to_erp ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                        {item.sku || item.product_code || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right">
                      {item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 text-right">
                      {item.tax.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                      {item.total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
