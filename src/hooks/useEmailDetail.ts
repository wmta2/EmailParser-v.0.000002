import { useState, useEffect } from 'react';
import { supabase, type RawEmail, type Order, type OrderItem, type Customer, type OrderExport } from '../lib/supabase';
import { previewEmailParse, parseAndCreateOrder } from '../lib/services/emailParsingService';
import type { ParsedOrderData, DetectionResult } from '../lib/emailParser';

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
    return previewEmailParse(email);
  }

  async function savePreviewedData(
    parsedData: ParsedOrderData,
    customerId?: string | null
  ) {
    if (!emailId || !email) return { success: false, message: 'Email not found' };

    const result = await parseAndCreateOrder(email, customerId);
    if (result.success) {
      await fetchEmailDetail();
    }
    return result;
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
