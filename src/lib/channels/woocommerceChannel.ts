import type {
  ChannelAdapter,
  FieldDefinition,
  RawOrderData,
  TransformedOrder,
  TransformedCustomer,
  ConnectionTestResult,
} from './types';

function formatAddress(addr: Record<string, any> | null): string {
  if (!addr) return '';
  const parts = [
    addr.first_name && addr.last_name ? `${addr.first_name} ${addr.last_name}` : '',
    addr.company || '',
    addr.address_1 || '',
    addr.address_2 || '',
    [addr.city, addr.state, addr.postcode].filter(Boolean).join(', '),
    addr.country || '',
  ].filter(Boolean);
  return parts.join('\n');
}

function mapWcStatus(wcStatus: string): string {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    processing: 'processing',
    'on-hold': 'pending',
    completed: 'completed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    failed: 'pending',
    trash: 'cancelled',
  };
  return statusMap[wcStatus] ?? 'pending';
}

export class WooCommerceAdapter implements ChannelAdapter {
  getConfigSchema(): FieldDefinition[] {
    return [
      {
        key: 'store_url',
        label: 'Store URL',
        type: 'text',
        required: true,
        placeholder: 'https://yourstore.com',
        group: 'connection',
      },
      {
        key: 'consumer_key',
        label: 'Consumer Key',
        type: 'password',
        required: true,
        placeholder: 'ck_...',
        group: 'connection',
      },
      {
        key: 'consumer_secret',
        label: 'Consumer Secret',
        type: 'password',
        required: true,
        placeholder: 'cs_...',
        group: 'connection',
      },
      {
        key: 'import_statuses',
        label: 'Import Order Statuses',
        type: 'text',
        required: false,
        placeholder: 'processing,completed,on-hold',
        group: 'import',
      },
      {
        key: 'per_page',
        label: 'Orders Per Page',
        type: 'number',
        required: false,
        placeholder: '50',
        group: 'advanced',
      },
    ];
  }

  async testConnection(
    config: Record<string, any>,
    credentials: Record<string, any>
  ): Promise<ConnectionTestResult> {
    try {
      const baseUrl = (config.store_url || credentials.store_url || '').replace(/\/+$/, '');
      const key = credentials.consumer_key || '';
      const secret = credentials.consumer_secret || '';

      if (!baseUrl || !key || !secret) {
        return { success: false, message: 'Store URL, consumer key, and consumer secret are required.' };
      }

      const url = `${baseUrl}/wp-json/wc/v3/system_status`;
      const headers = new Headers();
      headers.set('Authorization', 'Basic ' + btoa(`${key}:${secret}`));

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          message: `Connection failed (HTTP ${response.status}): ${text.substring(0, 200)}`,
        };
      }

      const data = await response.json();
      const storeName = data?.environment?.site_title || 'Unknown Store';
      const wcVersion = data?.environment?.version || 'Unknown';

      return {
        success: true,
        message: `Connected to "${storeName}" running WooCommerce ${wcVersion}`,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      };
    }
  }

  async fetchOrders(
    config: Record<string, any>,
    credentials: Record<string, any>,
    since?: string
  ): Promise<RawOrderData[]> {
    const baseUrl = (config.store_url || credentials.store_url || '').replace(/\/+$/, '');
    const key = credentials.consumer_key || '';
    const secret = credentials.consumer_secret || '';
    const perPage = config.per_page || 50;
    const statusFilter = config.import_statuses || 'processing,completed,on-hold';

    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa(`${key}:${secret}`));

    const allOrders: RawOrderData[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        per_page: String(perPage),
        page: String(page),
        status: statusFilter,
        orderby: 'date',
        order: 'desc',
      });

      if (since) {
        params.set('after', since);
      }

      const url = `${baseUrl}/wp-json/wc/v3/orders?${params}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`WooCommerce API error (HTTP ${response.status})`);
      }

      const orders: Record<string, any>[] = await response.json();

      for (const order of orders) {
        allOrders.push({
          externalId: String(order.id),
          rawJson: order,
        });
      }

      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
      hasMore = page < totalPages;
      page++;
    }

    return allOrders;
  }

  transformOrder(raw: RawOrderData): TransformedOrder {
    const wc = raw.rawJson;

    const items = (wc.line_items || []).map((li: Record<string, any>, idx: number) => ({
      product_code: String(li.product_id || ''),
      product_name: li.name || '',
      quantity: li.quantity || 0,
      unit_price: parseFloat(li.price || '0'),
      total: parseFloat(li.total || '0'),
      size: '',
      tax: parseFloat(li.total_tax || '0'),
      gross: parseFloat(li.total || '0') + parseFloat(li.total_tax || '0'),
      uom: '',
      position: idx,
      sku: li.sku || '',
      discount: parseFloat(li.subtotal || '0') - parseFloat(li.total || '0'),
    }));

    const billing = wc.billing || {};
    const shipping = wc.shipping || {};

    const customerData: TransformedCustomer | undefined = wc.billing
      ? {
          externalId: String(wc.customer_id || wc.id),
          name: [billing.first_name, billing.last_name].filter(Boolean).join(' ') || 'Unknown',
          email: billing.email || null,
          phone: billing.phone || null,
          company: billing.company || null,
          billingAddress: formatAddress(billing),
          shippingAddress: formatAddress(shipping),
          billing_name: [billing.first_name, billing.last_name].filter(Boolean).join(' ') || null,
          billing_address1: billing.address_1 || null,
          billing_address2: billing.address_2 || null,
          billing_address3: billing.company || null,
          billing_town: billing.city || null,
          billing_county: billing.state || null,
          billing_postcode: billing.postcode || null,
          billing_country: billing.country || null,
          billing_country_code: billing.country || null,
          billing_email: billing.email || null,
          billing_telephone: billing.phone || null,
          shipping_name: [shipping.first_name, shipping.last_name].filter(Boolean).join(' ') || null,
          shipping_address1: shipping.address_1 || null,
          shipping_address2: shipping.address_2 || null,
          shipping_address3: shipping.company || null,
          shipping_town: shipping.city || null,
          shipping_county: shipping.state || null,
          shipping_postcode: shipping.postcode || null,
          shipping_country: shipping.country || null,
          shipping_country_code: shipping.country || null,
          shipping_email: billing.email || null,
          shipping_telephone: shipping.phone || billing.phone || null,
          metadata: { wc_customer_id: wc.customer_id },
        }
      : undefined;

    return {
      order: {
        order_number: String(wc.number || wc.id || ''),
        delivery_address: formatAddress(shipping),
        billing_address: formatAddress(billing),
        notes: wc.customer_note || '',
        requester: customerData?.name || '',
        template_type: 'woocommerce',
        parsing_status: 'confirmed',
        parsing_error: null,
        parsed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        channel_source: 'woocommerce',
        external_order_id: String(wc.id),
        order_status: mapWcStatus(wc.status || 'pending'),
        currency: wc.currency || 'GBP',
        order_total: parseFloat(wc.total || '0'),
        shipping_total: parseFloat(wc.shipping_total || '0'),
        tax_total: parseFloat(wc.total_tax || '0'),
        discount_total: parseFloat(wc.discount_total || '0'),
        required_date: wc.date_completed || null,
        delivery_name: [shipping.first_name, shipping.last_name].filter(Boolean).join(' ') || null,
        delivery_address1: shipping.address_1 || null,
        delivery_address2: shipping.address_2 || null,
        delivery_address3: shipping.company || null,
        delivery_town: shipping.city || null,
        delivery_county: shipping.state || null,
        delivery_postcode: shipping.postcode || null,
        delivery_country: shipping.country || null,
        delivery_country_code: shipping.country || null,
        delivery_email: billing.email || null,
        delivery_telephone: shipping.phone || billing.phone || null,
        billing_name: [billing.first_name, billing.last_name].filter(Boolean).join(' ') || null,
        billing_address1: billing.address_1 || null,
        billing_address2: billing.address_2 || null,
        billing_address3: billing.company || null,
        billing_town: billing.city || null,
        billing_county: billing.state || null,
        billing_postcode: billing.postcode || null,
        billing_country: billing.country || null,
        billing_country_code: billing.country || null,
        billing_email: billing.email || null,
        billing_telephone: billing.phone || null,
      },
      items,
      customerData,
    };
  }
}
