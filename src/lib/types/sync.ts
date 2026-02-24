export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface SyncLogBase {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  status: SyncStatus;
  error_message: string | null;
  records_processed: number;
  records_successful: number;
  records_failed: number;
}

export interface CustomerSyncLog extends SyncLogBase {
  customers_created: number;
  customers_updated: number;
  addresses_synced?: number;
  addresses_created?: number;
  addresses_updated?: number;
}

export interface SyncItem {
  id: string;
  sync_log_id: string;
  customer_id: string;
  status: SyncStatus;
  error_message: string | null;
  synced_at: string | null;
}

export interface SyncMetadata {
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{ customerId?: string; error: string }>;
}
