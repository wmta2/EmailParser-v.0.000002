import { ToggleLeft, ToggleRight } from 'lucide-react';

interface Service {
  id: string;
  service_slug: string;
  service_name: string;
  description: string;
  enabled: boolean;
}

interface ServicesSectionProps {
  services: Service[];
  loading: boolean;
  onToggle: (id: string, enabled: boolean) => void;
}

export function ServicesSection({ services, loading, onToggle }: ServicesSectionProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">API Services</h3>
        <div className="text-center text-slate-500 py-4">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">API Services</h3>
        <p className="text-xs text-slate-500 mt-1">
          Enable or disable Orderwise API capabilities. Only enabled services will be available.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {services.map(service => (
          <div key={service.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{service.service_name}</span>
                {service.service_slug === 'sales-orders' && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">PRIMARY</span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{service.description}</p>
            </div>
            <button
              onClick={() => onToggle(service.id, !service.enabled)}
              className="flex-shrink-0 transition-colors"
            >
              {service.enabled ? (
                <ToggleRight className="w-8 h-8 text-blue-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
