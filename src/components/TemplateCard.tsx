import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { EmailTemplatePattern } from '../lib/templateEngine';

interface TemplateCardProps {
  template: EmailTemplatePattern;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

export function TemplateCard({ template, onEdit, onDelete, onToggleActive }: TemplateCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{template.template_name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              template.active
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {template.active ? 'Active' : 'Inactive'}
            </span>
            {template.platform ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {template.platform}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Universal
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{template.provider_name}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleActive(template.id, !template.active)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title={template.active ? 'Deactivate' : 'Activate'}
          >
            {template.active ? (
              <ToggleRight className="w-5 h-5 text-blue-600" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => onEdit(template.id)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">Template Type:</span>
          <code className="px-2 py-0.5 bg-gray-100 rounded text-gray-800">{template.template_type}</code>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">Priority:</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-800">{template.priority}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">Confidence Threshold:</span>
          <span className="text-gray-800">{template.confidence_threshold}%</span>
        </div>

        <div>
          <span className="font-medium text-gray-700 block mb-1">Detection Keywords:</span>
          <div className="flex flex-wrap gap-1">
            {template.detection_keywords.slice(0, 4).map((keyword, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                {keyword}
              </span>
            ))}
            {template.detection_keywords.length > 4 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                +{template.detection_keywords.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
