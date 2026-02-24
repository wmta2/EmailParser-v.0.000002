import { useState, useEffect } from 'react';
import { supabase, type RawEmail, type Order, type OrderItem, type EmailWithOrder, type OrderExport, type Customer } from '../lib/supabase';
import { parseEmail, detectTemplate, type ParsedOrderData, type DetectionResult } from '../lib/emailParser';
import { findCustomerMatch } from '../lib/customerMatcher';
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

let emailChannelIdCache: string | null = null;

async function getEmailChannelId(): Promise<string | null> {
  if (emailChannelIdCache) return emailChannelIdCache;
  const { data } = await supabase
    .from('sales_channels')
    .select('id')
    .eq('slug', 'email')
    .maybeSingle();
  emailChannelIdCache = data?.id ?? null;
  return emailChannelIdCache;
}

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

      let query = supabase
        .from('raw_email')
        .select('*', { count: 'exact' })
        .order(dbSortColumn, { ascending: sortDirection === 'asc' });

      if (search) {
        query = query.or(
          `subject.ilike.%${search}%,from_email.ilike.%${search}%`
        );
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

      let emailsWithOrders: EmailWithOrder[] = (emailsData || []).map(email => {
        const order = ordersData.find(o => o.raw_email_id === email.id);
        return { ...email, order };
      });

      if (statusFilter !== 'all') {
        emailsWithOrders = emailsWithOrders.filter(email => {
          if (statusFilter === 'unparsed') return !email.order;
          if (statusFilter === 'exported') return email.order?.ow_export_status === 'exported';
          if (statusFilter === 'export_failed') return email.order?.ow_export_status === 'export_failed';
          if (statusFilter === 'pending') return email.order?.parsing_status === 'pending' && !email.order?.ow_export_status;
          if (statusFilter === 'confirmed') return email.order?.parsing_status === 'confirmed' && !email.order?.ow_export_status;
          if (statusFilter === 'failed') return email.order?.parsing_status === 'failed';
          return true;
        });
      }

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

      const channelId = await getEmailChannelId();
      const parsedData = await parseEmail(emailData);

      if (!parsedData) {
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            raw_email_id: emailId,
            parsing_status: 'failed',
            parsing_error: 'Unable to detect email template or extract data',
            order_number: '',
            delivery_address: '',
            billing_address: '',
            notes: '',
            requester: emailData.from_email || '',
            template_type: 'unknown',
            channel_source: 'email',
            channel_id: channelId,
            external_order_id: emailData.message_id,
          });

        if (orderError) throw orderError;

        await storeRawImport(channelId, emailData, null, 'failed', 'Unable to detect email template');
        await fetchEmails();
        return { success: false, message: 'Failed to parse email - unknown template' };
      }

      const matchResult = await findCustomerMatch(
        parsedData.order.supplier_code,
        parsedData.order.delivery_postcode,
        parsedData.order.billing_postcode,
        parsedData.order.requester,
        parsedData.order.delivery_name
      );
      const customerId = matchResult.bestMatch?.id ?? null;

      const now = new Date().toISOString();
      const { data: currentUser } = await supabase.auth.getUser();

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          ...parsedData.order,
          raw_email_id: emailId,
          parsing_status: 'confirmed',
          confirmed_at: now,
          confirmed_by: currentUser?.user?.id ?? null,
          channel_source: 'email',
          channel_id: channelId,
          external_order_id: emailData.message_id,
          customer_id: customerId,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (parsedData.items.length > 0) {
        const itemsToInsert = parsedData.items.map(item => ({
          ...item,
          order_id: orderData.id
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await storeRawImport(channelId, emailData, orderData.id, 'confirmed', null);
      await fetchEmails();
      return { success: true, message: 'Email parsed and saved' };
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

async function storeRawImport(
  channelId: string | null,
  email: RawEmail,
  orderId: string | null,
  status: string,
  errorMessage: string | null
) {
  if (!channelId) return;
  const externalId = email.message_id || String(email.id);

  await supabase.from('channel_raw_imports').upsert({
    channel_id: channelId,
    external_id: externalId,
    raw_data: {
      id: email.id,
      subject: email.subject,
      from_email: email.from_email,
      content: email.content,
      html_body: email.html_body,
      message_id: email.message_id,
      date_received: email.date_received,
      platform: email.platform,
    },
    import_status: status,
    error_message: errorMessage,
    order_id: orderId,
  }, { onConflict: 'channel_id,external_id' });
}

export function useEmailDetail(emailId: number | null) {
  const [email, setEmail] = useState<RawEmail | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [latestFailedExport, setLatestFailedExport] = useState<OrderExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (emailId) {
      fetchEmailDetail();
    } else {
      setEmail(null);
      setOrder(null);
      setItems([]);
      setCustomer(null);
      setLatestFailedExport(null);
      setLoading(false);
    }
  }, [emailId]);

  async function fetchEmailDetail() {
    if (!emailId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: emailData, error: emailError } = await supabase
        .from('raw_email')
        .select('*')
        .eq('id', emailId)
        .maybeSingle();

      if (emailError) throw emailError;

      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('raw_email_id', emailId)
        .maybeSingle();

      let itemsData: OrderItem[] = [];
      let customerData: Customer | null = null;
      let failedExportData: OrderExport | null = null;

      if (orderData) {
        const [itemsResult, customerResult, exportsResult] = await Promise.all([
          supabase.from('order_items').select('*').eq('order_id', orderData.id).order('position'),
          orderData.customer_id
            ? supabase.from('customers').select('*').eq('id', orderData.customer_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from('order_exports').select('*')
            .eq('order_id', orderData.id)
            .eq('export_status', 'failed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        itemsData = itemsResult.data || [];
        customerData = customerResult.data;
        failedExportData = exportsResult.data;
      }

      setEmail(emailData);
      setOrder(orderData);
      setItems(itemsData);
      setCustomer(customerData);
      setLatestFailedExport(failedExportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email details');
    } finally {
      setLoading(false);
    }
  }

  async function previewParseEmail(): Promise<{
    parsedData: ParsedOrderData | null;
    detection: DetectionResult;
    suggestedCustomerId: string | null;
    suggestedCustomer: Customer | null;
  } | null> {
    if (!email) return null;

    try {
      const detection = await detectTemplate(email);
      const parsedData = await parseEmail(email);

      let suggestedCustomerId: string | null = null;
      let suggestedCustomer: Customer | null = null;
      if (parsedData) {
        const matchResult = await findCustomerMatch(
          parsedData.order.supplier_code,
          parsedData.order.delivery_postcode,
          parsedData.order.billing_postcode,
          parsedData.order.requester,
          parsedData.order.delivery_name
        );
        suggestedCustomer = matchResult.bestMatch ?? null;
        suggestedCustomerId = suggestedCustomer?.id ?? null;
      }

      return { parsedData, detection, suggestedCustomerId, suggestedCustomer };
    } catch (err) {
      console.error('Error previewing parse:', err);
      return null;
    }
  }

  async function savePreviewedData(
    parsedData: ParsedOrderData,
    customerId?: string | null
  ) {
    if (!emailId || !email) return { success: false, message: 'Email not found' };

    try {
      const channelId = await getEmailChannelId();

      const now = new Date().toISOString();
      const { data: currentUser } = await supabase.auth.getUser();

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          ...parsedData.order,
          raw_email_id: emailId,
          parsing_status: 'confirmed',
          confirmed_at: now,
          confirmed_by: currentUser?.user?.id ?? null,
          channel_source: 'email',
          channel_id: channelId,
          external_order_id: email.message_id,
          customer_id: customerId ?? null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (parsedData.items.length > 0) {
        const itemsToInsert = parsedData.items.map(item => ({
          ...item,
          order_id: orderData.id
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await storeRawImport(channelId, email, orderData.id, 'confirmed', null);
      await fetchEmailDetail();
      return { success: true, message: 'Order saved' };
    } catch (err) {
      console.error('Error saving order:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to save order'
      };
    }
  }

  async function confirmOrder() {
    if (!order) return { success: false, message: 'No order to confirm' };
    try {
      const now = new Date().toISOString();
      const { data: currentUser } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          parsing_status: 'confirmed',
          confirmed_at: now,
          confirmed_by: currentUser?.user?.id ?? null,
        })
        .eq('id', order.id);
      if (updateError) throw updateError;
      await fetchEmailDetail();
      return { success: true, message: 'Order confirmed' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to confirm order' };
    }
  }

  function setItemsState(updatedItems: OrderItem[]) {
    setItems(updatedItems);
  }

  return {
    email,
    order,
    items,
    customer,
    latestFailedExport,
    loading,
    error,
    refresh: fetchEmailDetail,
    previewParseEmail,
    savePreviewedData,
    confirmOrder,
    refetchOrder: fetchEmailDetail,
    setItems: setItemsState,
  };
}

export type { ParsedOrderData, DetectionResult };
