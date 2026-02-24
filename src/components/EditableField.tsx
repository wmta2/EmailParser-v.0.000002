import { Edit2, X, Check } from 'lucide-react';
import { useEditableField } from '../hooks/useEditableField';

interface FieldLabelProps {
  label: string;
  required?: boolean;
}

function FieldLabel({ label, required }: FieldLabelProps) {
  return (
    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </span>
  );
}

function SaveCancelButtons({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <>
      <button
        onClick={onSave}
        className="p-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        title="Save"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={onCancel}
        className="p-1.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
        title="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </>
  );
}

interface EditableTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel';
}

export function EditableTextField({
  label,
  value,
  onChange,
  editable,
  placeholder,
  required = false,
  type = 'text'
}: EditableTextFieldProps) {
  const { isEditing, tempValue, setTempValue, startEditing, cancel, save } = useEditableField(value);

  if (!editable) {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel label={label} />
        <span className="text-sm text-slate-900">{value || '-'}</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel label={label} required={required} />
        <div className="flex gap-2">
          <input
            type={type}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder}
            autoFocus
          />
          <SaveCancelButtons onSave={() => save(onChange)} onCancel={cancel} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel label={label} required={required} />
      <div className="group flex items-center gap-2 cursor-pointer" onClick={startEditing}>
        <span className="text-sm text-slate-900 border-b border-dashed border-slate-300 group-hover:border-blue-500 transition-colors">
          {value || '-'}
        </span>
        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

interface EditableTextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
  placeholder?: string;
  rows?: number;
}

export function EditableTextArea({
  label,
  value,
  onChange,
  editable,
  placeholder,
  rows = 3
}: EditableTextAreaProps) {
  const { isEditing, tempValue, setTempValue, startEditing, cancel, save } = useEditableField(value);

  if (!editable) {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel label={label} />
        <p className="text-sm text-slate-900 whitespace-pre-line">{value || '-'}</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel label={label} />
        <textarea
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          rows={rows}
          className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => save(onChange)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={cancel}
            className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors text-sm flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel label={label} />
      <div className="group cursor-pointer" onClick={startEditing}>
        <p className="text-sm text-slate-900 whitespace-pre-line border border-dashed border-slate-300 group-hover:border-blue-500 transition-colors rounded p-2 min-h-[60px]">
          {value || '-'}
        </p>
        <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
          <Edit2 className="w-3 h-3" />
          <span>Click to edit</span>
        </div>
      </div>
    </div>
  );
}

interface EditableDateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString();
}

export function EditableDateField({
  label,
  value,
  onChange,
  editable
}: EditableDateFieldProps) {
  const { isEditing, tempValue, setTempValue, startEditing, cancel, save } = useEditableField(value);
  const displayValue = formatDate(value);

  if (!editable) {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel label={label} />
        <span className="text-sm text-slate-900">{displayValue || '-'}</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel label={label} />
        <div className="flex gap-2">
          <input
            type="date"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <SaveCancelButtons onSave={() => save(onChange)} onCancel={cancel} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel label={label} />
      <div className="group flex items-center gap-2 cursor-pointer" onClick={startEditing}>
        <span className="text-sm text-slate-900 border-b border-dashed border-slate-300 group-hover:border-blue-500 transition-colors">
          {displayValue || '-'}
        </span>
        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

interface EditableNumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  editable: boolean;
  prefix?: string;
  decimals?: number;
}

export function EditableNumberField({
  label,
  value,
  onChange,
  editable,
  prefix = '$',
  decimals = 2
}: EditableNumberFieldProps) {
  const { isEditing, tempValue, setTempValue, startEditing, cancel, save } = useEditableField(value.toString());
  const displayValue = `${prefix}${value.toFixed(decimals)}`;

  const handleSave = () => {
    const numValue = parseFloat(tempValue);
    if (!isNaN(numValue)) onChange(numValue);
    save(() => {});
  };

  if (!editable) {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel label={label} />
        <span className="text-sm text-slate-900">{displayValue}</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel label={label} />
        <div className="flex gap-2">
          <div className="flex-1 flex items-center border border-blue-300 rounded-md overflow-hidden">
            <span className="px-2 bg-slate-50 text-slate-600 text-sm">{prefix}</span>
            <input
              type="number"
              step="0.01"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm focus:outline-none"
              autoFocus
            />
          </div>
          <SaveCancelButtons onSave={handleSave} onCancel={cancel} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel label={label} />
      <div className="group flex items-center gap-2 cursor-pointer" onClick={startEditing}>
        <span className="text-sm text-slate-900 border-b border-dashed border-slate-300 group-hover:border-blue-500 transition-colors">
          {displayValue}
        </span>
        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
