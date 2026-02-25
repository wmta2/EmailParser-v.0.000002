import { supabase } from '../supabase';
import type { RawEmail, Order } from '../supabase';
import { parseEmail, detectTemplate } from '../emailParser';
import { findCustomerMatch, type CustomerMatchCriteria } from '../customerMatcher';
import type { ParsedOrderData } from '../emailParser';
import { sanitizeOrderItem } from '../textSanitizer';

let emailChannelIdCache: string | null = null;

export async function getEmailChannelId(): Promise<string | null> {
  if (emailChannelIdCache) return emailChannelIdCache;
  const { data } = await supabase
    .from('sales_channels')
    .select('id')
    .eq('slug', 'email')
    .maybeSingle();
  emailChannelIdCache = data?.id ?? null;
  return emailChannelIdCache;
}

export async function storeRawImport(
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

export async function parseAndCreateOrder(
  email: RawEmail,
  customerId?: string | null
): Promise<{ success: boolean; message: string; orderId?: string }> {
  try {
    const channelId = await getEmailChannelId();
    const parsedData = await parseEmail(email);

    if (!parsedData) {
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          raw_email_id: email.id,
          parsing_status: 'failed',
          parsing_error: 'Unable to detect email template or extract data',
          order_number: '',
          delivery_address: '',
          billing_address: '',
          notes: '',
          requester: email.from_email || '',
          template_type: 'unknown',
          channel_source: 'email',
          channel_id: channelId,
          external_order_id: email.message_id,
        });

      if (orderError) throw orderError;

      await storeRawImport(channelId, email, null, 'failed', 'Unable to detect email template');
      return { success: false, message: 'Failed to parse email - unknown template' };
    }

    let finalCustomerId = customerId ?? null;
    if (!finalCustomerId) {
      const criteria: CustomerMatchCriteria = {
        accountNumber: parsedData.order.account_number,
        supplierCode: parsedData.order.supplier_code,
        deliveryPostcode: parsedData.order.delivery_postcode,
        billingPostcode: parsedData.order.billing_postcode,
        requester: parsedData.order.requester,
        deliveryName: parsedData.order.delivery_name,
      };
      const matchResult = await findCustomerMatch(criteria);
      finalCustomerId = matchResult.bestMatch?.id ?? null;
    }

    const now = new Date().toISOString();
    const { data: currentUser } = await supabase.auth.getUser();

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...parsedData.order,
        raw_email_id: email.id,
        parsing_status: 'confirmed',
        confirmed_at: now,
        confirmed_by: currentUser?.user?.id ?? null,
        channel_source: 'email',
        channel_id: channelId,
        external_order_id: email.message_id,
        customer_id: finalCustomerId,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    if (parsedData.items.length > 0) {
      const itemsToInsert = parsedData.items
        .map(item => sanitizeOrderItem(item))
        .map(item => ({
          ...item,
          order_id: orderData.id
        }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    await storeRawImport(channelId, email, orderData.id, 'confirmed', null);
    return { success: true, message: 'Email parsed and saved', orderId: orderData.id };
  } catch (err) {
    console.error('Error parsing email:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to parse email'
    };
  }
}

export async function previewEmailParse(email: RawEmail) {
  try {
    const detection = await detectTemplate(email);
    const parsedData = await parseEmail(email);

    let suggestedCustomerId: string | null = null;
    let suggestedCustomer = null;

    if (parsedData) {
      const criteria: CustomerMatchCriteria = {
        accountNumber: parsedData.order.account_number,
        supplierCode: parsedData.order.supplier_code,
        deliveryPostcode: parsedData.order.delivery_postcode,
        billingPostcode: parsedData.order.billing_postcode,
        requester: parsedData.order.requester,
        deliveryName: parsedData.order.delivery_name,
      };
      const matchResult = await findCustomerMatch(criteria);
      suggestedCustomer = matchResult.bestMatch ?? null;
      suggestedCustomerId = suggestedCustomer?.id ?? null;
    }

    return { parsedData, detection, suggestedCustomerId, suggestedCustomer };
  } catch (err) {
    console.error('Error previewing parse:', err);
    return null;
  }
}
