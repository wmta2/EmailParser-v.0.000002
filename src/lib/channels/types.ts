import type { Order, OrderItem } from '../supabase';

export interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  group?: 'connection' | 'import' | 'advanced';
}

export interface RawOrderData {
  externalId: string;
  rawJson: Record<string, any>;
}

export interface TransformedOrder {
  order: Omit<Order, 'id' | 'created_at' | 'raw_email_id' | 'channel_id' | 'customer_id'>;
  items: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[];
  customerData?: TransformedCustomer;
}

export interface RawCustomerData {
  externalId: string;
  rawJson: Record<string, any>;
}

export interface TransformedCustomer {
  externalId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  billing_name?: string | null;
  billing_address1?: string | null;
  billing_address2?: string | null;
  billing_address3?: string | null;
  billing_town?: string | null;
  billing_county?: string | null;
  billing_postcode?: string | null;
  billing_country?: string | null;
  billing_country_code?: string | null;
  billing_email?: string | null;
  billing_telephone?: string | null;
  shipping_name?: string | null;
  shipping_address1?: string | null;
  shipping_address2?: string | null;
  shipping_address3?: string | null;
  shipping_town?: string | null;
  shipping_county?: string | null;
  shipping_postcode?: string | null;
  shipping_country?: string | null;
  shipping_country_code?: string | null;
  shipping_email?: string | null;
  shipping_telephone?: string | null;
  metadata: Record<string, any>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface ChannelAdapter {
  testConnection(config: Record<string, any>, credentials: Record<string, any>): Promise<ConnectionTestResult>;
  fetchOrders(config: Record<string, any>, credentials: Record<string, any>, since?: string): Promise<RawOrderData[]>;
  transformOrder(raw: RawOrderData): TransformedOrder;
  getConfigSchema(): FieldDefinition[];
}
