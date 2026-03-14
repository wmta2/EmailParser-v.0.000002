import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  is_disabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
  invited_by: string | null;
  token: string;
  used: boolean;
  created_at: string;
  expires_at: string;
}

export interface RawEmail {
  id: number;
  created_at: string;
  content: string | null;
  customer_id: number | null;
  date_parsed: string | null;
  subject: string | null;
  from_email: string | null;
  html_body: string | null;
  message_id: string | null;
  date_received: string | null;
  platform: string | null;
}

export interface EmailTemplatePattern {
  id: string;
  template_name: string;
  template_type: string;
  detection_patterns: Record<string, any>;
  parsing_rules: Record<string, any>;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  raw_email_id: number | null;
  order_number: string;
  notes: string;
  requester: string;
  supplier_code: string;
  template_type: string;
  parsing_status: 'pending' | 'confirmed' | 'failed';
  parsing_error: string | null;
  parsed_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  ow_export_status: 'exported' | 'export_failed' | null;
  created_at: string;
  channel_source: string;
  channel_id: string | null;
  customer_id: string | null;
  external_order_id: string | null;
  channel_customer_id: string | null;
  order_status: string;
  currency: string;
  order_total: number;
  shipping_total: number;
  tax_total: number;
  discount_total: number;
  required_date: string | null;
  delivery_name: string | null;
  delivery_address1: string | null;
  delivery_address2: string | null;
  delivery_address3: string | null;
  delivery_address4: string | null;
  delivery_address5: string | null;
  delivery_town: string | null;
  delivery_county: string | null;
  delivery_postcode: string | null;
  delivery_country: string | null;
  delivery_country_code: string | null;
  delivery_email: string | null;
  delivery_telephone: string | null;
  delivery_phone_extension: string | null;
  delivery_mobile: string | null;
  billing_name: string | null;
  billing_address1: string | null;
  billing_address2: string | null;
  billing_address3: string | null;
  billing_address4: string | null;
  billing_address5: string | null;
  billing_town: string | null;
  billing_county: string | null;
  billing_postcode: string | null;
  billing_country: string | null;
  billing_country_code: string | null;
  billing_email: string | null;
  billing_telephone: string | null;
  billing_phone_extension: string | null;
  billing_mobile: string | null;
  account_number: string | null;
  full_address: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  size: string;
  tax: number;
  gross: number;
  uom: string;
  position: number;
  created_at: string;
  sku: string;
  discount: number;
  export_to_erp: boolean;
}

export interface OrderWithItems extends Order {
  items?: OrderItem[];
}

export interface EmailWithOrder extends RawEmail {
  order?: Order;
}

export interface SalesChannel {
  id: string;
  name: string;
  slug: string;
  channel_type: string;
  description: string;
  icon_name: string;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ChannelConfiguration {
  id: string;
  channel_id: string;
  config_data: Record<string, any>;
  credentials: Record<string, any>;
  last_sync_at: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

export interface AddressFields {
  name: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
  email: string | null;
  telephone: string | null;
}

export interface Customer {
  id: string;
  external_id: string | null;
  source_channel_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  billing_name: string | null;
  billing_address1: string | null;
  billing_address2: string | null;
  billing_address3: string | null;
  billing_town: string | null;
  billing_county: string | null;
  billing_postcode: string | null;
  billing_country: string | null;
  billing_country_code: string | null;
  billing_email: string | null;
  billing_telephone: string | null;
  shipping_name: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_address3: string | null;
  shipping_town: string | null;
  shipping_county: string | null;
  shipping_postcode: string | null;
  shipping_country: string | null;
  shipping_country_code: string | null;
  shipping_email: string | null;
  shipping_telephone: string | null;
  account_number: string | null;
  orderwise_id: number | null;
  on_hold: boolean | null;
  manual_on_hold: boolean | null;
  balance: string | null;
  credit_limit: string | null;
  available_to_spend: string | null;
  open_orders_value: string | null;
  over_credit_terms: boolean | null;
  vat_number: string | null;
  currency_id: number | null;
  price_list_id: number | null;
  nominal_code_id: number | null;
  default_tax_code_id: number | null;
  last_amended_at: string | null;
  supplier_code: string | null;
}

export interface ChannelCustomer {
  id: string;
  channel_id: string;
  external_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  billing_name: string | null;
  billing_address1: string | null;
  billing_address2: string | null;
  billing_address3: string | null;
  billing_town: string | null;
  billing_county: string | null;
  billing_postcode: string | null;
  billing_country: string | null;
  billing_country_code: string | null;
  billing_email: string | null;
  billing_telephone: string | null;
  shipping_name: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_address3: string | null;
  shipping_town: string | null;
  shipping_county: string | null;
  shipping_postcode: string | null;
  shipping_country: string | null;
  shipping_country_code: string | null;
  shipping_email: string | null;
  shipping_telephone: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CustomerSourceMapping {
  id: string;
  customer_id: string;
  external_system: string;
  external_customer_id: string;
  mapping_status: string;
  last_synced_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ChannelSyncLog {
  id: string;
  channel_id: string;
  sync_type: string;
  status: string;
  orders_imported: number;
  orders_skipped: number;
  orders_failed: number;
  error_message: string | null;
  error_details: Record<string, any> | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ChannelRawImport {
  id: string;
  channel_id: string;
  sync_log_id: string | null;
  external_id: string;
  raw_data: Record<string, any>;
  import_status: string;
  error_message: string | null;
  order_id: string | null;
  created_at: string;
}

export interface OrderWithChannel extends Order {
  channel?: SalesChannel;
  customer?: Customer;
  items?: OrderItem[];
}

export interface ErpDestination {
  id: string;
  name: string;
  slug: string;
  erp_type: string;
  description: string;
  icon_name: string;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ErpConfiguration {
  id: string;
  erp_destination_id: string;
  config_data: Record<string, any>;
  credentials: Record<string, any>;
  last_sync_at: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

export interface ErpService {
  id: string;
  erp_destination_id: string;
  service_slug: string;
  service_name: string;
  description: string;
  enabled: boolean;
  created_at: string;
}

export interface OrderExport {
  id: string;
  order_id: string;
  erp_destination_id: string;
  export_status: 'pending' | 'processing' | 'success' | 'failed';
  external_order_id: string | null;
  external_order_number: string | null;
  error_message: string | null;
  request_payload: Record<string, any>;
  response_payload: Record<string, any>;
  exported_at: string | null;
  created_at: string;
}

export interface ErpSyncLog {
  id: string;
  erp_destination_id: string;
  sync_type: string;
  status: string;
  orders_exported: number;
  orders_skipped: number;
  orders_failed: number;
  error_message: string | null;
  error_details: Record<string, any> | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface CustomerDeliveryAddress {
  id: string;
  customer_id: string;
  external_id: string;
  name: string | null;
  contact_name: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
  telephone: string | null;
  email: string | null;
  is_default: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAddressSyncLog {
  id: string;
  customer_id: string;
  erp_destination_id: string;
  status: 'running' | 'completed' | 'failed';
  addresses_fetched: number;
  addresses_created: number;
  addresses_updated: number;
  addresses_skipped: number;
  error_message: string | null;
  error_details: Record<string, any> | null;
  request_headers: Record<string, any> | null;
  request_body: Record<string, any> | null;
  response_headers: Record<string, any> | null;
  response_body: Record<string, any> | null;
  http_method: string | null;
  endpoint: string | null;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface DeliveryAddressSyncItem {
  id: string;
  sync_log_id: string;
  delivery_address_id: string | null;
  external_id: string;
  action: 'created' | 'updated' | 'skipped';
  address_snapshot: Record<string, any>;
  error_message: string | null;
  created_at: string;
}

export type ComputedStatus = 'unparsed' | 'pending' | 'confirmed' | 'exported' | 'export_failed' | 'failed' | 'unknown';

export interface OrderEmailsView {
  email_id: number;
  email_created_at: string;
  email_content: string | null;
  email_customer_id: number | null;
  email_date_parsed: string | null;
  email_subject: string | null;
  email_from_email: string | null;
  email_html_body: string | null;
  email_message_id: string | null;
  email_date_received: string | null;
  email_platform: string | null;
  order_id: string | null;
  order_raw_email_id: number | null;
  order_order_number: string | null;
  order_notes: string | null;
  order_requester: string | null;
  order_template_type: string | null;
  order_parsing_status: 'pending' | 'confirmed' | 'failed' | null;
  order_parsing_error: string | null;
  order_parsed_at: string | null;
  order_created_at: string | null;
  order_channel_source: string | null;
  order_channel_id: string | null;
  order_customer_id: string | null;
  order_external_order_id: string | null;
  order_channel_customer_id: string | null;
  order_order_status: string | null;
  order_currency: string | null;
  order_order_total: number | null;
  order_shipping_total: number | null;
  order_tax_total: number | null;
  order_discount_total: number | null;
  order_confirmed_at: string | null;
  order_confirmed_by: string | null;
  order_supplier_code: string | null;
  order_required_date: string | null;
  order_delivery_name: string | null;
  order_delivery_address1: string | null;
  order_delivery_address2: string | null;
  order_delivery_address3: string | null;
  order_delivery_address4: string | null;
  order_delivery_address5: string | null;
  order_delivery_town: string | null;
  order_delivery_county: string | null;
  order_delivery_postcode: string | null;
  order_delivery_country: string | null;
  order_delivery_country_code: string | null;
  order_delivery_email: string | null;
  order_delivery_telephone: string | null;
  order_delivery_phone_extension: string | null;
  order_delivery_mobile: string | null;
  order_billing_name: string | null;
  order_billing_address1: string | null;
  order_billing_address2: string | null;
  order_billing_address3: string | null;
  order_billing_address4: string | null;
  order_billing_address5: string | null;
  order_billing_town: string | null;
  order_billing_county: string | null;
  order_billing_postcode: string | null;
  order_billing_country: string | null;
  order_billing_country_code: string | null;
  order_billing_email: string | null;
  order_billing_telephone: string | null;
  order_billing_phone_extension: string | null;
  order_billing_mobile: string | null;
  order_account_number: string | null;
  order_full_address: string | null;
  order_ow_export_status: 'exported' | 'export_failed' | null;
  computed_status: ComputedStatus;
}

export interface GmailConnection {
  id: string;
  gmail_address: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  connection_status: 'connected' | 'disconnected' | 'error';
  last_synced_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface GmailImportRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  match_field: 'sender' | 'subject' | 'body';
  match_type: 'contains' | 'exact' | 'starts_with' | 'regex';
  match_value: string;
  action: 'import_only' | 'parse_with_template' | 'skip';
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GmailSyncSchedule {
  id: string;
  enabled: boolean;
  peak_start_time: string;
  peak_end_time: string;
  peak_interval_minutes: number;
  off_peak_interval_minutes: number;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface GmailSyncLog {
  id: string;
  sync_type: 'manual' | 'scheduled';
  status: 'running' | 'success' | 'partial' | 'failed';
  emails_found: number;
  emails_imported: number;
  emails_skipped: number;
  emails_failed: number;
  error_message: string | null;
  error_details: Record<string, any> | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export function transformViewToEmailWithOrder(viewRow: OrderEmailsView): EmailWithOrder {
  const email: RawEmail = {
    id: viewRow.email_id,
    created_at: viewRow.email_created_at,
    content: viewRow.email_content,
    customer_id: viewRow.email_customer_id,
    date_parsed: viewRow.email_date_parsed,
    subject: viewRow.email_subject,
    from_email: viewRow.email_from_email,
    html_body: viewRow.email_html_body,
    message_id: viewRow.email_message_id,
    date_received: viewRow.email_date_received,
    platform: viewRow.email_platform,
  };

  if (viewRow.order_id) {
    const order: Order = {
      id: viewRow.order_id,
      raw_email_id: viewRow.order_raw_email_id,
      order_number: viewRow.order_order_number || '',
      notes: viewRow.order_notes || '',
      requester: viewRow.order_requester || '',
      supplier_code: viewRow.order_supplier_code || '',
      template_type: viewRow.order_template_type || '',
      parsing_status: viewRow.order_parsing_status || 'pending',
      parsing_error: viewRow.order_parsing_error,
      parsed_at: viewRow.order_parsed_at,
      confirmed_at: viewRow.order_confirmed_at,
      confirmed_by: viewRow.order_confirmed_by,
      ow_export_status: viewRow.order_ow_export_status,
      created_at: viewRow.order_created_at || '',
      channel_source: viewRow.order_channel_source || '',
      channel_id: viewRow.order_channel_id,
      customer_id: viewRow.order_customer_id,
      external_order_id: viewRow.order_external_order_id,
      channel_customer_id: viewRow.order_channel_customer_id,
      order_status: viewRow.order_order_status || '',
      currency: viewRow.order_currency || '',
      order_total: viewRow.order_order_total || 0,
      shipping_total: viewRow.order_shipping_total || 0,
      tax_total: viewRow.order_tax_total || 0,
      discount_total: viewRow.order_discount_total || 0,
      required_date: viewRow.order_required_date,
      delivery_name: viewRow.order_delivery_name,
      delivery_address1: viewRow.order_delivery_address1,
      delivery_address2: viewRow.order_delivery_address2,
      delivery_address3: viewRow.order_delivery_address3,
      delivery_address4: viewRow.order_delivery_address4,
      delivery_address5: viewRow.order_delivery_address5,
      delivery_town: viewRow.order_delivery_town,
      delivery_county: viewRow.order_delivery_county,
      delivery_postcode: viewRow.order_delivery_postcode,
      delivery_country: viewRow.order_delivery_country,
      delivery_country_code: viewRow.order_delivery_country_code,
      delivery_email: viewRow.order_delivery_email,
      delivery_telephone: viewRow.order_delivery_telephone,
      delivery_phone_extension: viewRow.order_delivery_phone_extension,
      delivery_mobile: viewRow.order_delivery_mobile,
      billing_name: viewRow.order_billing_name,
      billing_address1: viewRow.order_billing_address1,
      billing_address2: viewRow.order_billing_address2,
      billing_address3: viewRow.order_billing_address3,
      billing_address4: viewRow.order_billing_address4,
      billing_address5: viewRow.order_billing_address5,
      billing_town: viewRow.order_billing_town,
      billing_county: viewRow.order_billing_county,
      billing_postcode: viewRow.order_billing_postcode,
      billing_country: viewRow.order_billing_country,
      billing_country_code: viewRow.order_billing_country_code,
      billing_email: viewRow.order_billing_email,
      billing_telephone: viewRow.order_billing_telephone,
      billing_phone_extension: viewRow.order_billing_phone_extension,
      billing_mobile: viewRow.order_billing_mobile,
      account_number: viewRow.order_account_number,
      full_address: viewRow.order_full_address,
    };

    return { ...email, order };
  }

  return email;
}
