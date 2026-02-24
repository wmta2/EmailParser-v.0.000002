import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

function OrderExportDetail({ exp, statusColors }: { exp: any; statusColors: Record<string, string> }) {
  const [showPayload, setShowPayload] = useState(false);
  const orderNumber = exp.orders?.order_number || exp.id;
  const hasFailed = exp.export_status === 'failed';

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setShowPayload(!showPayload)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {showPayload ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          <span className="text-sm font-medium text-slate-800">#{orderNumber}</span>
          {exp.error_message && (
            <span className="text-xs text-red-600 truncate max-w-xs">{exp.error_message}</span>
          )}
        </div>
        <span className={`text-xs font-medium ${statusColors[exp.export_status] || 'text-slate-500'}`}>
          {exp.export_status}
        </span>
      </button>
      {showPayload && (hasFailed || exp.request_payload || exp.response_payload) && (
        <div className="px-4 pb-3 space-y-2 bg-slate-50 border-t border-slate-200">
          {exp.request_payload && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase mt-2 mb-1">Request</p>
              <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs overflow-x-auto max-h-48 overflow-y-auto">
                {JSON.stringify(exp.request_payload, null, 2)}
              </pre>
            </div>
          )}
          {exp.response_payload && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase mt-2 mb-1">Response</p>
              <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs overflow-x-auto max-h-48 overflow-y-auto">
                {JSON.stringify(exp.response_payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExportLogRow({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const [orderExports, setOrderExports] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const statusColors: Record<string, string> = {
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
  };

  const orderExportStatusColors: Record<string, string> = {
    success: 'text-green-600',
    failed: 'text-red-600',
    processing: 'text-blue-600',
    pending: 'text-amber-600',
  };

  const duration = log.completed_at && log.started_at
    ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
    : null;

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && orderExports.length === 0 && log.erp_destination_id) {
      setLoadingDetails(true);
      const start = log.started_at;
      const end = log.completed_at || new Date().toISOString();
      const { data } = await supabase
        .from('order_exports')
        .select('id, export_status, error_message, request_payload, response_payload, created_at, orders(order_number)')
        .eq('erp_destination_id', log.erp_destination_id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });
      setOrderExports(data ?? []);
      setLoadingDetails(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExpand}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[log.status] || 'bg-slate-100 text-slate-600'}`}>
            {log.status}
          </span>
          <span className="text-sm text-slate-600">
            {new Date(log.started_at).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="text-green-600">{log.orders_exported} exported</span>
          {log.orders_skipped > 0 && <span className="text-slate-500">{log.orders_skipped} skipped</span>}
          {log.orders_failed > 0 && <span className="text-red-600">{log.orders_failed} failed</span>}
          {duration !== null && <span>{duration}s</span>}
          <Clock className="w-3.5 h-3.5" />
        </div>
      </button>
      {expanded && (
        <div className="px-6 pb-4 space-y-3">
          {loadingDetails ? (
            <p className="text-xs text-slate-500">Loading details...</p>
          ) : orderExports.length > 0 ? (
            orderExports.map(exp => (
              <OrderExportDetail key={exp.id} exp={exp} statusColors={orderExportStatusColors} />
            ))
          ) : log.error_details ? (
            <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs overflow-x-auto max-h-40 overflow-y-auto">
              {JSON.stringify(log.error_details, null, 2)}
            </pre>
          ) : null}
        </div>
      )}
    </div>
  );
}

interface SyncHistorySectionProps {
  logs: any[];
  loading: boolean;
}

export function SyncHistorySection({ logs, loading }: SyncHistorySectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Export History</h3>
      </div>
      {loading ? (
        <div className="p-6 text-center text-slate-500">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="p-6 text-center text-slate-500">No export history yet</div>
      ) : (
        <div className="divide-y divide-slate-200">
          {logs.map(log => (
            <ExportLogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
