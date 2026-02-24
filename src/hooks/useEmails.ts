import { useState, useEffect } from 'react';
import { supabase, type RawEmail, type Order, type EmailWithOrder, type OrderEmailsView, transformViewToEmailWithOrder } from '../lib/supabase';
import { detectTemplate, type DetectionResult } from '../lib/emailParser';
import { parseAndCreateOrder } from '../lib/services/emailParsingService';

export type EmailSortColumn = 'created_at' | 'subject' | 'from_email' | 'platform' | 'status';
export type EmailSortDirection = 'asc' | 'desc';

function getEmailStatusOrder(email: EmailWithOrder): number {
  if (!email.order) return 0;
  if (email.order.ow_export_status === 'exported') return 4;
  if (email.order.ow_export_status === 'export_failed') return 5;
  if (email.order.parsing_status === 'confirmed') return 3;
  if (email.order.parsing_status === 'pending') return 2;
  if (email.order.parsing_status === 'failed') return 6;
  return 1;
}

const PAGE_SIZE = 25;

export interface UseEmailsOptions {
  page?: number;
  pageSize?: number;
  sortColumn?: EmailSortColumn;
  sortDirection?: EmailSortDirection;
  search?: string;
  statusFilter?: 'all' | 'pending' | 'confirmed' | 'unparsed' | 'failed' | 'exported' | 'export_failed';
}

export interface UseEmailsResult {
  emails: EmailWithOrder[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  fetchEmails: () => void;
  parseAndSaveEmail: (emailId: number) => Promise<{ success: boolean; message: string }>;
  bulkParseEmails: (emailIds?: number[]) => Promise<{ total: number; success: number; failed: number }>;
  templateDetections: Map<number, DetectionResult>;
  detectTemplatesForUnparsed: () => Promise<void>;
}

export function useEmails(options: UseEmailsOptions = {}): UseEmailsResult {
  const {
    page = 1,
    pageSize = PAGE_SIZE,
    sortColumn = 'created_at',
    sortDirection = 'desc',
    search = '',
    statusFilter = 'all',
  } = options;

  const [emails, setEmails] = useState<EmailWithOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateDetections, setTemplateDetections] = useState<Map<number, DetectionResult>>(new Map());

  useEffect(() => {
    fetchEmails();
  }, [page, pageSize, sortColumn, sortDirection, search, statusFilter]);

  async function fetchEmails() {
    try {
      setLoading(true);
      setError(null);

      const dbSortColumn = sortColumn === 'status' ? 'email_created_at' :
                           sortColumn === 'created_at' ? 'email_created_at' :
                           sortColumn === 'subject' ? 'email_subject' :
                           sortColumn === 'from_email' ? 'email_from_email' :
                           sortColumn === 'platform' ? 'email_platform' :
                           'email_created_at';

      let query = supabase
        .from('order_emails_view')
        .select('*', { count: 'exact' });

      if (statusFilter !== 'all') {
        query = query.eq('computed_status', statusFilter);
      }

      if (search) {
        query = query.or(`email_subject.ilike.%${search}%,email_from_email.ilike.%${search}%`);
      }

      if (sortColumn !== 'status') {
        query = query.order(dbSortColumn, { ascending: sortDirection === 'asc' });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: viewData, error: viewError, count } = await query;
      if (viewError) throw viewError;

      let emailsWithOrders = (viewData || []).map((row: OrderEmailsView) =>
        transformViewToEmailWithOrder(row)
      );

      if (sortColumn === 'status') {
        emailsWithOrders.sort((a, b) => {
          const orderA = getEmailStatusOrder(a);
          const orderB = getEmailStatusOrder(b);
          return sortDirection === 'asc' ? orderA - orderB : orderB - orderA;
        });
      }

      setEmails(emailsWithOrders);
      setTotalCount(count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }

  async function parseAndSaveEmail(emailId: number) {
    try {
      const { data: emailData } = await supabase
        .from('raw_email')
        .select('*')
        .eq('id', emailId)
        .maybeSingle();

      if (!emailData) throw new Error('Email not found');

      const existingOrder = await supabase
        .from('orders')
        .select('*')
        .eq('raw_email_id', emailId)
        .maybeSingle();

      if (existingOrder.data) {
        return { success: true, message: 'Email already parsed' };
      }

      const result = await parseAndCreateOrder(emailData);
      await fetchEmails();
      return result;
    } catch (err) {
      console.error('Error parsing email:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to parse email'
      };
    }
  }

  async function bulkParseEmails(emailIds?: number[]) {
    let emailsToParse: EmailWithOrder[];
    if (emailIds && emailIds.length > 0) {
      emailsToParse = emails.filter(e => !e.order && emailIds.includes(e.id));
    } else {
      emailsToParse = emails.filter(e => !e.order);
    }

    const results = await Promise.all(
      emailsToParse.map(email => parseAndSaveEmail(email.id))
    );

    const successCount = results.filter(r => r.success).length;
    return {
      total: emailsToParse.length,
      success: successCount,
      failed: emailsToParse.length - successCount
    };
  }

  async function detectTemplatesForUnparsed() {
    const unparsedEmails = emails.filter(e => !e.order);
    const newDetections = new Map(templateDetections);

    await Promise.all(
      unparsedEmails.map(async (email) => {
        if (!newDetections.has(email.id)) {
          try {
            const detection = await detectTemplate(email);
            newDetections.set(email.id, detection);
          } catch (err) {
            console.error(`Failed to detect template for email ${email.id}:`, err);
            newDetections.set(email.id, { templateType: 'unknown', confidence: 0 });
          }
        }
      })
    );

    setTemplateDetections(newDetections);
  }

  return {
    emails,
    totalCount,
    loading,
    error,
    fetchEmails,
    parseAndSaveEmail,
    bulkParseEmails,
    templateDetections,
    detectTemplatesForUnparsed
  };
}
