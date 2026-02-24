import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  activeSortKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  align?: 'left' | 'right';
}

export function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = activeSortKey === sortKey;

  return (
    <th
      className={`px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 transition-colors ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(sortKey)}
    >
      <span className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-slate-900" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </span>
    </th>
  );
}
