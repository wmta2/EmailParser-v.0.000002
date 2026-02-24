import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DOMFieldConfig, DOMTableConfig } from '../lib/domEmailParser';
import { SelectorOption } from '../lib/domUtils';
import { EmailRenderer } from './EmailRenderer';
import { FieldMappingPanel } from './FieldMappingPanel';
import { ExtractionPreview } from './ExtractionPreview';
import { SampleEmailManager } from './SampleEmailManager';
import { useTemplateSamples } from '../hooks/useTemplateSamples';

interface VisualBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  domConfig: {
    fields: Record<string, DOMFieldConfig>;
    lineItems?: DOMTableConfig;
  };
  onSave: (config: { fields: Record<string, DOMFieldConfig>; lineItems?: DOMTableConfig }) => void;
}

export function VisualBuilderModal({
  isOpen,
  onClose,
  templateId,
  domConfig: initialConfig,
  onSave
}: VisualBuilderModalProps) {
  const { samples, loading, getPrimarySample } = useTemplateSamples(templateId);
  const [domConfig, setDomConfig] = useState(initialConfig);
  const [currentSample, setCurrentSample] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<{
    active: boolean;
    fieldPath: string;
    fieldType: 'field' | 'table-column' | 'table-row';
  } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectorAlternatives, setSelectorAlternatives] = useState<Record<string, SelectorOption[]>>({});

  useEffect(() => {
    if (samples.length > 0 && !currentSample) {
      const primary = getPrimarySample();
      if (primary) {
        setCurrentSample(primary.html_content);
      }
    }
  }, [samples, currentSample, getPrimarySample]);

  useEffect(() => {
    setDomConfig(initialConfig);
  }, [initialConfig]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  const handleSave = () => {
    onSave(domConfig);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleFieldUpdate = (fieldPath: string, config: DOMFieldConfig) => {
    setDomConfig(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldPath]: config
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleTableUpdate = (tableConfig: DOMTableConfig) => {
    setDomConfig(prev => ({
      ...prev,
      lineItems: tableConfig
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveField = (fieldPath: string) => {
    setDomConfig(prev => {
      const newFields = { ...prev.fields };
      delete newFields[fieldPath];
      return {
        ...prev,
        fields: newFields
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleElementSelected = (selector: string, _value: string, alternatives: SelectorOption[]) => {
    if (!selectionMode) return;

    const fieldPath = selectionMode.fieldPath;

    if (selectionMode.fieldType === 'field') {
      handleFieldUpdate(fieldPath, {
        selector,
        attribute: undefined
      });
      setSelectorAlternatives(prev => ({ ...prev, [fieldPath]: alternatives }));
    } else if (selectionMode.fieldType === 'table-row') {
      handleTableUpdate({
        rowSelector: selector,
        columns: domConfig.lineItems?.columns || {}
      });
      setSelectorAlternatives(prev => ({ ...prev, ['lineItems.row']: alternatives }));
    } else if (selectionMode.fieldType === 'table-column') {
      handleTableUpdate({
        rowSelector: domConfig.lineItems?.rowSelector || '',
        columns: {
          ...domConfig.lineItems?.columns,
          [fieldPath]: {
            selector: selector,
            attribute: undefined
          }
        }
      });
      setSelectorAlternatives(prev => ({ ...prev, [`lineItems.col.${fieldPath}`]: alternatives }));
    }

    setSelectionMode(null);
  };

  const handleSelectAlternative = (fieldPath: string, selector: string) => {
    handleFieldUpdate(fieldPath, {
      selector,
      attribute: undefined
    });
  };

  const handleStartMapping = (fieldPath: string) => {
    if (fieldPath === 'lineItems') {
      // Mapping table row
      setSelectionMode({
        active: true,
        fieldPath,
        fieldType: 'table-row'
      });
    } else {
      // Mapping regular field
      setSelectionMode({
        active: true,
        fieldPath,
        fieldType: 'field'
      });
    }
  };

  const handleStartTableColumnMapping = (columnKey: string) => {
    setSelectionMode({
      active: true,
      fieldPath: columnKey,
      fieldType: 'table-column'
    });
  };

  const handleRemoveTableColumn = (columnKey: string) => {
    if (!domConfig.lineItems) return;

    const newColumns = { ...domConfig.lineItems.columns };
    delete newColumns[columnKey];

    handleTableUpdate({
      rowSelector: domConfig.lineItems.rowSelector,
      columns: newColumns
    });
  };

  const handleCancelMapping = () => {
    setSelectionMode(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-[98vw] max-h-[98vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Visual Template Builder</h2>
            <p className="text-sm text-gray-600 mt-1">
              Click elements in the email to map them to order fields
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-600 mr-2">Unsaved changes</span>
            )}
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <FieldMappingPanel
            domConfig={domConfig}
            html={currentSample || undefined}
            onStartMapping={handleStartMapping}
            onRemoveField={handleRemoveField}
            onFieldUpdate={handleFieldUpdate}
            onTableUpdate={handleTableUpdate}
            onStartTableColumnMapping={handleStartTableColumnMapping}
            onRemoveTableColumn={handleRemoveTableColumn}
            selectionMode={selectionMode}
            onCancelMapping={handleCancelMapping}
            selectorAlternatives={selectorAlternatives}
            onSelectAlternative={handleSelectAlternative}
          />

          <div className="flex-1 flex flex-col border-l border-r overflow-hidden">
            <SampleEmailManager
              templateId={templateId}
              onSampleChange={(html) => setCurrentSample(html)}
            />

            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading sample emails...</div>
                </div>
              ) : !currentSample ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">No sample email available</p>
                    <p className="text-sm mt-2">Upload a sample email to get started</p>
                  </div>
                </div>
              ) : (
                <EmailRenderer
                  html={currentSample}
                  selectionMode={selectionMode?.active || false}
                  selectionFieldType={selectionMode?.fieldType}
                  onElementSelected={handleElementSelected}
                />
              )}
            </div>
          </div>

          <ExtractionPreview
            html={currentSample || ''}
            domConfig={domConfig}
          />
        </div>
      </div>
    </div>
  );
}
