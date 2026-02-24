import { useState, useEffect } from 'react';
import { supabase, type RawEmail, type Order, type EmailWithOrder } from '../lib/supabase';
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

      const dbSortColumn = sortColumn === 'status' ? 'created_at' : sortColumn;

      // Build query based on status filter
      let emailsWithOrders: EmailWithOrder[] = [];
      let totalFilteredCount = 0;

      if (statusFilter === 'unparsed') {
        // Fetch emails that don't have orders
        let query = supabase
          .from('raw_email')
          .select('*', { count: 'exact' })
          .order(dbSortColumn, { ascending: sortDirection === 'asc' });

        if (search) {
          query = query.or(`subject.ilike.%${search}%,from_email.ilike.%${search}%`);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data: emailsData, error: emailsError, count } = await query;
        if (emailsError) throw emailsError;

        const emailIds = (emailsData || []).map(e => e.id);

        // Check which emails have orders
        let ordersData: Order[] = [];
        if (emailIds.length > 0) {
          const { data } = await supabase
            .from('orders')
            .select('*')
            .in('raw_email_id', emailIds);
          ordersData = data || [];
        }

        // Filter out emails that have orders
        emailsWithOrders = (emailsData || [])
          .map(email => {
            const order = ordersData.find(o => o.raw_email_id === email.id);
            return { ...email, order };
          })
          .filter(email => !email.order);

        // Count unparsed emails
        const { count: unparsedCount } = await supabase
          .from('raw_email')
          .select('id', { count: 'exact', head: true });

        const { count: parsedCount } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('channel_source', 'email');

        totalFilteredCount = (unparsedCount ?? 0) - (parsedCount ?? 0);

      } else if (statusFilter === 'all') {
        // Fetch all emails with orders
        let query = supabase
          .from('raw_email')
          .select('*', { count: 'exact' })
          .order(dbSortColumn, { ascending: sortDirection === 'asc' });

        if (search) {
          query = query.or(`subject.ilike.%${search}%,from_email.ilike.%${search}%`);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data: emailsData, error: emailsError, count } = await query;
        if (emailsError) throw emailsError;

        const emailIds = (emailsData || []).map(e => e.id);

        let ordersData: Order[] = [];
        if (emailIds.length > 0) {
          const { data } = await supabase
            .from('orders')
            .select('*')
            .in('raw_email_id', emailIds);
          ordersData = data || [];
        }

        emailsWithOrders = (emailsData || []).map(email => {
          const order = ordersData.find(o => o.raw_email_id === email.id);
          return { ...email, order };
        });

        totalFilteredCount = count ?? 0;

      } else {
        // Fetch orders with specific status, then get their emails
        let orderQuery = supabase
          .from('orders')
          .select('*, raw_email!inner(id, created_at, subject, from_email, platform, message_id, date_received, customer_id, date_parsed)', { count: 'exact' })
          .eq('channel_source', 'email');

        // Apply status-specific filters
        if (statusFilter === 'exported') {
          orderQuery = orderQuery.eq('ow_export_status', 'exported');
        } else if (statusFilter === 'export_failed') {
          orderQuery = orderQuery.eq('ow_export_status', 'export_failed');
        } else if (statusFilter === 'pending') {
          orderQuery = orderQuery.eq('parsing_status', 'pending').is('ow_export_status', null);
        } else if (statusFilter === 'confirmed') {
          orderQuery = orderQuery.eq('parsing_status', 'confirmed').is('ow_export_status', null);
        } else if (statusFilter === 'failed') {
          orderQuery = orderQuery.eq('parsing_status', 'failed');
        }

        // Apply search filter on email fields
        if (search) {
          orderQuery = orderQuery.or(
            `raw_email.subject.ilike.%${search}%,raw_email.from_email.ilike.%${search}%`
          );
        }

        // Apply sorting on email fields
        const orderColumn = dbSortColumn === 'created_at' ? 'raw_email.created_at' :
                           dbSortColumn === 'subject' ? 'raw_email.subject' :
                           dbSortColumn === 'from_email' ? 'raw_email.from_email' :
                           dbSortColumn === 'platform' ? 'raw_email.platform' :
                           'raw_email.created_at';

        orderQuery = orderQuery.order(orderColumn, { ascending: sortDirection === 'asc' });

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        orderQuery = orderQuery.range(from, to);

        const { data: ordersWithEmails, error: ordersError, count } = await orderQuery;
        if (ordersError) throw ordersError;

        // Transform to EmailWithOrder format
        emailsWithOrders = (ordersWithEmails || []).map(orderRecord => {
          const { raw_email, ...order } = orderRecord as any;
          return { ...raw_email, order: order as Order };
        });

        totalFilteredCount = count ?? 0;
      }

      // Sort by status if needed (client-side only for status column)
      if (sortColumn === 'status') {
        emailsWithOrders.sort((a, b) => {
          const orderA = getEmailStatusOrder(a);
          const orderB = getEmailStatusOrder(b);
          return sortDirection === 'asc' ? orderA - orderB : orderB - orderA;
        });
      }

      setEmails(emailsWithOrders);
      setTotalCount(totalFilteredCount);
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
