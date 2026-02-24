import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  RotateCw,
} from 'lucide-react';

export type StatusConfig = {
  label: string;
  color: string;
  icon: typeof Clock;
};

export const ORDER_PARSING_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: RotateCw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-600', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export const EXPORT_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  success: { label: 'Success', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export const SYNC_LOG_STATUS_CONFIG: Record<string, StatusConfig> = {
  started: { label: 'Started', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  success: { label: 'Success', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
};
