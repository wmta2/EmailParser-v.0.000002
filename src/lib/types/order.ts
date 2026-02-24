export type OrderStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'cancelled';
export type ExportStatus = 'not_exported' | 'pending' | 'exported' | 'failed';

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sku: string | null;
  export_to_erp: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  customer_id: string | null;
  channel_id: string | null;
  external_order_id: string | null;
  order_number: string;
  order_date: string;
  status: OrderStatus;
  total_amount: number;
  currency: string;
  customer_name: string;
  customer_email: string | null;
  account_number: string | null;
  supplier_code: string | null;
  address_line_1: string;
  address_line_2: string | null;
  address_line_3: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  full_address: string | null;
  notes: string | null;
  raw_email_id: string | null;
  created_at: string;
  updated_at: string;
  ow_export_status: ExportStatus;
  ow_export_error: string | null;
  ow_exported_at: string | null;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface OrderWithCustomer extends Order {
  customers: {
    id: string;
    name: string;
    email: string | null;
    account_number: string | null;
  } | null;
}
