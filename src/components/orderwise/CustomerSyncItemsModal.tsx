import { useState, useEffect } from 'react';
import { X, User, AlertCircle, CheckCircle, RotateCcw, Search, ChevronRight } from 'lucide-react';
import type { CustomerSyncItem } from '../../hooks/useOrderwiseCustomerSync';

interface CustomerSyncItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncLogId: string;
  actionFilter: 'created' | 'updated' | 'skipped';
  totalCount: number;
  syncDate: string;
  fetchSyncItems: (syncLogId: string, actionFilter?: 'created' | 'updated' | 'skipped') => Promise<CustomerSyncItem[]>;
  onViewDetail: (item: CustomerSyncItem) => void;
}

export function CustomerSyncItemsModal({
  isOpen,
  onClose,
  syncLogId,
  actionFilter,
  totalCount,
  syncDate,
  fetchSyncItems,
  onViewDetail,
}: CustomerSyncItemsModalProps) {
  const [items, setItems] = useState<CustomerSyncItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && syncLogId) {
      setLoading(true);
      fetchSyncItems(syncLogId, actionFilter)
        .then(setItems)
        .finally(() => setLoading(false));
    }
  }, [isOpen, syncLogId, actionFilter, fetchSyncItems]);

  if (!isOpen) return null;

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const snapshot = item.customer_snapshot as Record<string, unknown>;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.external_id.toLowerCase().includes(searchLower) ||
      (snapshot.name as string)?.toLowerCase().includes(searchLower) ||
      (snapshot.company as string)?.toLowerCase().includes(searchLower) ||
      (snapshot.email as string)?.toLowerCase().includes(searchLower)
    );
  });

  const actionConfig = {
    created: { label: 'Created', bgColor: 'bg-green-100', textColor: 'text-green-700', Icon: CheckCircle },
    updated: { label: 'Updated', bgColor: 'bg-blue-100', textColor: 'text-blue-700', Icon: RotateCcw },
    skipped: { label: 'Skipped', bgColor: 'bg-amber-100', textColor: 'text-amber-700', Icon: AlertCircle },
  };

  const config = actionConfig[actionFilter];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <config.Icon className={`w-5 h-5 ${config.textColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {config.label} Customers ({totalCount})
              </h2>
              <p className="text-sm text-slate-500">
                Sync: {new Date(syncDate).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, company, account number, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-900" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {searchTerm ? 'No customers match your search' : 'No customers in this category'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map(item => {
                const snapshot = item.customer_snapshot as Record<string, unknown>;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewDetail(item)}
                    className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900 truncate">
                            {snapshot.name as string || 'Unknown'}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                            {item.external_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          {snapshot.company && (
                            <span className="truncate">{String(snapshot.company)}</span>
                          )}
                          {snapshot.email && (
                            <span className="truncate">{String(snapshot.email)}</span>
                          )}
                        </div>
                        {item.error_message && (
                          <p className="mt-1 text-xs text-amber-600 truncate">
                            {item.error_message}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <p className="text-sm text-slate-500 text-center">
            Showing {filteredItems.length} of {items.length} customers
          </p>
        </div>
      </div>
    </div>
  );
}
