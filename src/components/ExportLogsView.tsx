import { useState, useEffect } from 'react';
import { supabase, type OrderExport } from '../lib/supabase';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Server,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { EXPORT_STATUS_CONFIG as STATUS_CONFIG } from '../lib/statusConfig';

interface EnrichedExport extends OrderExport {
  order_number?: string;
  channel_name?: string;
  erp_name?: string;
}

interface ExportStats {
  totalToday: number;
  successToday: number;
  failedToday: number;
  successRate: number;
  lastExportTime: string | null;
}

export function ExportLogsView({ filterOrderId }: { filterOrderId?: string }) {
  const [exports, setExports] = useState<EnrichedExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<ExportStats>({
    totalToday: 0,
    successToday: 0,
    failedToday: 0,
    successRate: 0,
    lastExportTime: null,
  });

  const fetchExports = async () => {
    setLoading(true);

    let query = supabase
      .from('order_exports')
      .select(`
        *,
        orders!inner(order_number, channel_name),
        erp_destinations!inner(name)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filterOrderId) {
      query = query.eq('order_id', filterOrderId);
    }

    const { data, error } = await query;

    if (!error && data) {
      const enriched = data.map((exp: any) => ({
        ...exp,
        order_number: exp.orders?.order_number,
        channel_name: exp.orders?.channel_name,
        erp_name: exp.erp_destinations?.name,
      }));
      setExports(enriched);
      calculateStats(enriched);
    }

    setLoading(false);
  };

  const calculateStats = (data: EnrichedExport[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayExports = data.filter(exp => {
      const expDate = new Date(exp.created_at);
      return expDate >= today;
    });

    const successToday = todayExports.filter(exp => exp.export_status === 'success').length;
    const failedToday = todayExports.filter(exp => exp.export_status === 'failed').length;
    const successRate = todayExports.length > 0
      ? Math.round((successToday / todayExports.length) * 100)
      : 0;

    const lastExport = data.find(exp => exp.exported_at);

    setStats({
      totalToday: todayExports.length,
      successToday,
      failedToday,
      successRate,
      lastExportTime: lastExport?.exported_at || null,
    });
  };

  useEffect(() => {
    fetchExports();
  }, [filterOrderId]);

  const filteredExports = exports.filter(exp => {
    const matchesStatus = statusFilter === 'all' || exp.export_status === statusFilter;
    const matchesSearch = !searchQuery ||
      exp.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.external_order_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {!filterOrderId && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Exports Today"
              value={stats.totalToday}
              icon={Server}
              color="text-slate-600"
            />
            <StatCard
              label="Success Rate"
              value={`${stats.successRate}%`}
              icon={TrendingUp}
              color="text-green-600"
            />
            <StatCard
              label="Succeeded Today"
              value={stats.successToday}
              icon={CheckCircle}
              color="text-green-600"
            />
            <StatCard
              label="Failed Today"
              value={stats.failedToday}
              icon={XCircle}
              color="text-red-600"
            />
          </div>

          {stats.lastExportTime && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>Last export: {new Date(stats.lastExportTime).toLocaleString()}</span>
            </div>
          )}
        </>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order number or external ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
            </select>
            <button
              onClick={fetchExports}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading export logs...</p>
        </div>
      ) : filteredExports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
          <Server className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No export logs found</h3>
          <p className="text-slate-600">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Export logs will appear here after exporting orders'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-8 px-4 py-3"></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Date/Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">ERP Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">External Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExports.map(exp => {
                  const isExpanded = expandedId === exp.id;
                  const statusCfg = STATUS_CONFIG[exp.export_status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <>
                      <tr
                        key={exp.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                      >
                        <td className="px-4 py-3">
                          {(exp.request_payload || exp.response_payload || exp.error_message)
                            ? (isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />)
                            : <span className="w-4 h-4 block" />
                          }
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600">
                          {new Date(exp.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                          {exp.order_number || '-'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600">
                          {exp.erp_name || 'Unknown'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${statusCfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600 font-mono">
                          {exp.external_order_number || '-'}
                        </td>
                        <td className="px-6 py-3 text-sm text-red-600 max-w-xs truncate">
                          {exp.error_message || '-'}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${exp.id}-detail`}>
                          <td colSpan={7} className="px-6 pb-4 pt-0 bg-slate-50">
                            <div className="ml-8 space-y-4">
                              {exp.error_message && (
                                <div>
                                  <h4 className="text-xs font-semibold text-red-800 mb-1 uppercase">Error Message</h4>
                                  <p className="text-sm text-red-700">{exp.error_message}</p>
                                </div>
                              )}
                              {exp.request_payload && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-700 mb-1 uppercase">Request Payload</h4>
                                  <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs overflow-x-auto max-h-60 overflow-y-auto">
                                    {JSON.stringify(exp.request_payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {exp.response_payload && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-700 mb-1 uppercase">Response Payload</h4>
                                  <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs overflow-x-auto max-h-60 overflow-y-auto">
                                    {JSON.stringify(exp.response_payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-6 py-3">
            <p className="text-sm text-slate-500">
              Showing {filteredExports.length} export log{filteredExports.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: typeof Server; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className="w-8 h-8 text-slate-300" />
      </div>
    </div>
  );
}
