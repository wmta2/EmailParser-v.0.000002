import { X } from 'lucide-react';

const COLUMN_FIELD_TYPES = [
  { label: 'Product Code', value: 'product_code' },
  { label: 'Product Name', value: 'product_name' },
  { label: 'Quantity', value: 'quantity' },
  { label: 'Unit Price', value: 'unit_price' },
  { label: 'Total', value: 'total' },
  { label: 'Size', value: 'size' },
  { label: 'Tax', value: 'tax' },
  { label: 'Gross', value: 'gross' },
  { label: 'UOM (Unit of Measure)', value: 'uom' },
  { label: 'Skip (ignore)', value: 'skip' }
];

interface ColumnMappingRowProps {
  columnIndex: number;
  fieldType: string;
  onChange: (columnIndex: number, fieldType: string) => void;
  onRemove: (columnIndex: number) => void;
  canRemove: boolean;
}

export function ColumnMappingRow({ columnIndex, fieldType, onChange, onRemove, canRemove }: ColumnMappingRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <div className="min-w-[100px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Column {columnIndex}</label>
          <div className="px-3 py-2 bg-white border border-gray-300 rounded text-sm text-gray-700">
            Index {columnIndex}
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Maps To</label>
          <select
            value={fieldType}
            onChange={(e) => onChange(columnIndex, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select field type...</option>
            {COLUMN_FIELD_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(columnIndex)}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors mt-5"
          title="Remove column"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
