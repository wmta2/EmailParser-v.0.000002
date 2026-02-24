export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  account_number: string | null;
  supplier_code: string | null;
  orderwise_id: string | null;
  created_at: string;
  updated_at: string;
  last_amended: string | null;
}

export interface ChannelCustomer {
  id: string;
  user_id: string;
  channel_id: string;
  customer_id: string;
  external_customer_id: string;
  account_number: string | null;
  raw_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CustomerDeliveryAddress {
  id: string;
  customer_id: string;
  user_id: string;
  address_line_1: string;
  address_line_2: string | null;
  address_line_3: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  is_default: boolean;
  orderwise_id: string | null;
  created_at: string;
  updated_at: string;
  last_amended: string | null;
}

export interface CustomerWithChannel extends Customer {
  channel_customers: ChannelCustomer[];
}

export interface CustomerWithAddresses extends Customer {
  delivery_addresses: CustomerDeliveryAddress[];
}
