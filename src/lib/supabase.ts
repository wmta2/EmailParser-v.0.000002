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
