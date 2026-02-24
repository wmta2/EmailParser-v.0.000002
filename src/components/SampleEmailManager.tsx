import React, { useState, useRef } from 'react';
import { Upload, Star, Trash2, Plus } from 'lucide-react';
import { useTemplateSamples } from '../hooks/useTemplateSamples';

interface SampleEmailManagerProps {
  templateId: string;
  onSampleChange: (html: string) => void;
}

export function SampleEmailManager({ templateId, onSampleChange }: SampleEmailManagerProps) {
  const { samples, loading, createSample, deleteSample, setPrimarySample, getPrimarySample } = useTemplateSamples(templateId);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadHtml, setUploadHtml] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (samples.length > 0 && !selectedSampleId) {
      const primary = getPrimarySample();
      if (primary) {
        setSelectedSampleId(primary.id);
        onSampleChange(primary.html_content);
      }
    }
  }, [samples, selectedSampleId, getPrimarySample]);

  const handleSampleSelect = (sampleId: string) => {
    const sample = samples.find(s => s.id === sampleId);
    if (sample) {
      setSelectedSampleId(sampleId);
      onSampleChange(sample.html_content);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const html = event.target?.result as string;
      setUploadHtml(html);
      setUploadName(file.name.replace(/\.html?$/i, ''));
    };
    reader.readAsText(file);
  };

  const handleSaveSample = async () => {
    if (!uploadName.trim() || !uploadHtml.trim()) return;

    const sample = await createSample({
      name: uploadName,
      html_content: uploadHtml,
      subject: null,
      from_email: null,
      notes: null,
      is_primary: samples.length === 0
    });

    if (sample) {
      setUploadName('');
      setUploadHtml('');
      setShowUpload(false);
      setSelectedSampleId(sample.id);
      onSampleChange(sample.html_content);
    }
  };

  const handleDelete = async (sampleId: string) => {
    if (!confirm('Are you sure you want to delete this sample?')) return;

    await deleteSample(sampleId);

    if (selectedSampleId === sampleId) {
      const remaining = samples.filter(s => s.id !== sampleId);
      if (remaining.length > 0) {
        handleSampleSelect(remaining[0].id);
      } else {
        setSelectedSampleId(null);
        onSampleChange('');
      }
    }
  };

  const handleSetPrimary = async (sampleId: string) => {
    await setPrimarySample(sampleId);
  };

  return (
    <div className="border-b bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Sample Email</label>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Add sample"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {showUpload && (
        <div className="bg-gray-50 border rounded p-3 space-y-2">
          <input
            type="text"
            placeholder="Sample name"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border rounded"
          />

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 bg-white border rounded hover:bg-gray-50 flex items-center justify-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              {uploadHtml ? 'Change File' : 'Upload HTML File'}
            </button>
          </div>

          <div>
            <textarea
              placeholder="Or paste HTML here..."
              value={uploadHtml}
              onChange={(e) => setUploadHtml(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded font-mono text-xs h-24"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveSample}
              disabled={!uploadName.trim() || !uploadHtml.trim()}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              Save Sample
            </button>
            <button
              onClick={() => {
                setShowUpload(false);
                setUploadName('');
                setUploadHtml('');
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading samples...</div>
      ) : samples.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-2">
          No samples yet. Upload one to get started.
        </div>
      ) : (
        <div className="space-y-1">
          {samples.map(sample => (
            <div
              key={sample.id}
              className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                selectedSampleId === sample.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleSampleSelect(sample.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetPrimary(sample.id);
                }}
                className="p-1 hover:bg-white rounded"
                title={sample.is_primary ? 'Primary sample' : 'Set as primary'}
              >
                <Star
                  className={`w-3 h-3 ${
                    sample.is_primary ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                  }`}
                />
              </button>

              <span className="flex-1 text-sm text-gray-900 truncate">{sample.name}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(sample.id);
                }}
                className="p-1 hover:bg-white rounded"
                title="Delete sample"
              >
                <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
