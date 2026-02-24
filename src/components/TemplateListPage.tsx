import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { TemplateCard } from './TemplateCard';

const PLATFORM_OPTIONS = [
  { label: 'Universal (No Platform)', value: null },
  { label: 'WooCommerce', value: 'woocommerce' },
  { label: 'Email', value: 'email' }
];

interface TemplateListPageProps {
  onCreateNew: () => void;
  onEdit: (id: string) => void;
}

export function TemplateListPage({ onCreateNew, onEdit }: TemplateListPageProps) {
  const { templates, loading, error, fetchTemplates, deleteTemplate, toggleTemplateActive } = useTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const filter: any = {};
    if (activeFilter !== 'all') {
      filter.active = activeFilter === 'active';
    }
    if (platformFilter !== 'all') {
      filter.platform = platformFilter === 'universal' ? null : platformFilter;
    }
    if (searchQuery) {
      filter.search = searchQuery;
    }
    fetchTemplates(filter);
  }, [searchQuery, activeFilter, platformFilter]);

  const handleDelete = async (id: string) => {
    const result = await deleteTemplate(id);
    setShowDeleteConfirm(null);
    if (result.success) {
      alert(result.message);
    } else {
      alert(`Error: ${result.message}`);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const result = await toggleTemplateActive(id, active);
    if (!result.success) {
      alert(`Error: ${result.message}`);
    }
  };

  const filteredTemplates = templates;

  const activeCount = templates.filter(t => t.active).length;
  const inactiveCount = templates.length - activeCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pl-16 lg:pl-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600 mt-1">Manage email parsing templates and configurations</p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Template
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates by name or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Platforms</option>
          <option value="universal">Universal Only</option>
          {PLATFORM_OPTIONS.filter(p => p.value).map(option => (
            <option key={option.value!} value={option.value!}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({templates.length})
          </button>
          <button
            onClick={() => setActiveFilter('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeFilter === 'active'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setActiveFilter('inactive')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeFilter === 'inactive'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-64" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No templates found</h3>
          <p className="text-gray-600">
            {searchQuery || activeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first template'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={onEdit}
              onDelete={(id) => setShowDeleteConfirm(id)}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Template</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
