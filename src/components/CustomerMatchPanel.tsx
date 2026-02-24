import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Search, User } from 'lucide-react';
import { useCustomerMatch, type CustomerMatchResult, type MatchMethod, type CustomerMatchCriteria } from '../hooks/useCustomerMatch';
import type { Customer } from '../lib/supabase';
import { TIMING } from '../lib/constants';

interface CustomerMatchPanelProps {
  criteria: CustomerMatchCriteria;
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: Customer | null, method: MatchMethod) => void;
  searchCustomers: (q: string) => Promise<Customer[]>;
}

export function CustomerMatchPanel({
  criteria,
  selectedCustomerId,
  onSelectCustomer,
  searchCustomers,
}: CustomerMatchPanelProps) {
  const { findCustomerMatches } = useCustomerMatch();
  const [matchResult, setMatchResult] = useState<CustomerMatchResult | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [manuallySelectedCustomer, setManuallySelectedCustomer] = useState<Customer | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingMatch(true);
      const result = await findCustomerMatches(criteria);
      if (!cancelled) {
        setMatchResult(result);
        if (result.bestMatch && !selectedCustomerId) {
          onSelectCustomer(result.bestMatch, result.matchMethod ?? 'manual');
        }
      }
      setLoadingMatch(false);
    }
    run();
    return () => { cancelled = true; };
  }, [criteria.accountNumber, criteria.supplierCode, criteria.deliveryPostcode, criteria.billingPostcode, criteria.requester, criteria.deliveryName]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const results = await searchCustomers(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, TIMING.DEBOUNCE_SEARCH);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedCustomer: Customer | null =
    manuallySelectedCustomer ??
    (matchResult?.bestMatch?.id === selectedCustomerId
      ? matchResult.bestMatch
      : matchResult?.candidates.find(c => c.id === selectedCustomerId) ?? null);

  const showSearch = isChanging || (!selectedCustomer && !loadingMatch);

  if (loadingMatch) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-1">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Searching for customer match...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedCustomer ? (
        <div className="flex items-start justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-start gap-2 min-w-0">
            <User className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-900 truncate">{selectedCustomer.name}</span>
              </div>
              {selectedCustomer.account_number && (
                <p className="text-xs text-slate-500 font-mono">{selectedCustomer.account_number}</p>
              )}
              {(selectedCustomer.billing_postcode || selectedCustomer.shipping_postcode) && (
                <p className="text-xs text-slate-400">
                  {selectedCustomer.billing_postcode || selectedCustomer.shipping_postcode}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setIsChanging(true);
              setSearchQuery('');
            }}
            className="text-xs text-slate-500 hover:text-slate-700 underline flex-shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="text-sm text-slate-500 italic">No customer matched</div>
      )}

      {matchResult && matchResult.candidates.length > 1 && !selectedCustomer && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Postcode candidates:</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {matchResult.candidates.map(c => (
              <button
                key={c.id}
                onClick={() => onSelectCustomer(c, 'postcode')}
                className="w-full text-left px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-900">{c.name}</span>
                {c.account_number && <span className="ml-2 text-xs text-slate-500 font-mono">{c.account_number}</span>}
                {c.billing_postcode && <span className="ml-2 text-xs text-slate-400">{c.billing_postcode}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSearch && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
            {searching && (
              <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-slate-400" />
            )}
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
            >
              {searchResults.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setManuallySelectedCustomer(c);
                    onSelectCustomer(c, 'manual');
                    setSearchQuery('');
                    setShowDropdown(false);
                    setIsChanging(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <span className="font-medium text-slate-900">{c.name}</span>
                  {c.account_number && <span className="ml-2 text-xs text-slate-500 font-mono">{c.account_number}</span>}
                  {c.email && <p className="text-xs text-slate-400 mt-0.5">{c.email}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
