import type { Order, OrderItem, Customer } from '../supabase';
import type {
  OrderwiseProduct,
  ProductFetchResult,
  PriceListFetchResult,
  ProductPriceFetchResult
} from '../types/product';

export interface ErpFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  group?: 'connection' | 'mapping' | 'advanced';
}

export interface ErpConnectionTestResult {
  success: boolean;
  message: string;
}

export interface OrderExportPayload {
  order: Order;
  items: OrderItem[];
  customer: Customer | null;
}

export interface OrderExportResult {
  success: boolean;
  externalOrderId?: string;
  externalOrderNumber?: string;
  errorMessage?: string;
  requestPayload: Record<string, any>;
  responsePayload: Record<string, any>;
}

export interface OrderStatusResult {
  orderNumber: string;
  eCommerceOrderNumber: string;
  orderStatus: string;
  subStatus: string;
}

export interface ValueListItem {
  id: number;
  name: string;
  description?: string;
}

export interface CustomerFetchResult {
  success: boolean;
  customers: OrderwiseCustomer[];
  errorMessage?: string;
}

export interface OrderwiseDeliveryAddress {
  id: string | number;
  name?: string;
  contactName?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
  telephone?: string;
  email?: string;
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

export interface ApiRequestMetadata {
  httpMethod: string;
  endpoint: string;
  requestHeaders: Record<string, any>;
  responseHeaders?: Record<string, any>;
  responseBody?: Record<string, any>;
  durationMs: number;
}

export interface DeliveryAddressFetchResult {
  success: boolean;
  addresses: OrderwiseDeliveryAddress[];
  errorMessage?: string;
  apiMetadata?: ApiRequestMetadata;
}

export interface OrderwiseCustomer {
  id?: number;
  accountNumber: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  billingName?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingAddress3?: string;
  billingTown?: string;
  billingCounty?: string;
  billingPostcode?: string;
  billingCountry?: string;
  billingCountryCode?: string;
  billingEmail?: string;
  billingTelephone?: string;
  shippingName?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingAddress3?: string;
  shippingTown?: string;
  shippingCounty?: string;
  shippingPostcode?: string;
  shippingCountry?: string;
  shippingCountryCode?: string;
  shippingEmail?: string;
  shippingTelephone?: string;
  onHold?: boolean;
  manualOnHold?: boolean;
  balance?: number;
  creditLimit?: number;
  availableToSpend?: number;
  openOrdersValue?: number;
  overCreditTerms?: boolean;
  vatNumber?: string;
  currencyId?: number;
  priceListId?: number;
  nominalCodeId?: number;
  defaultTaxCodeId?: number;
  lastAmendedDateTime?: string;
  metadata?: Record<string, any>;
}

export interface ErpAdapter {
  testConnection(
    config: Record<string, any>,
    credentials: Record<string, any>,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<ErpConnectionTestResult>;

  getConfigSchema(): ErpFieldDefinition[];

  exportOrder(
    config: Record<string, any>,
    credentials: Record<string, any>,
    payload: OrderExportPayload
  ): Promise<OrderExportResult>;

  exportOrders(
    config: Record<string, any>,
    credentials: Record<string, any>,
    payloads: OrderExportPayload[]
  ): Promise<OrderExportResult[]>;

  getOrderStatus?(
    config: Record<string, any>,
    credentials: Record<string, any>,
    externalOrderId: string
  ): Promise<OrderStatusResult>;

  fetchValueList?(
    credentials: Record<string, any>,
    listId: number,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<ValueListItem[]>;

  fetchCustomers?(
    credentials: Record<string, any>,
    erpDestinationId?: string,
    erpConfigurationId?: string,
    lastModifiedSince?: string
  ): Promise<CustomerFetchResult>;

  fetchCustomerDeliveryAddresses?(
    credentials: Record<string, any>,
    customerAccountNumber: string,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<DeliveryAddressFetchResult>;

  fetchProducts?(
    credentials: Record<string, any>,
    erpDestinationId?: string,
    erpConfigurationId?: string,
    lastModifiedSince?: string
  ): Promise<ProductFetchResult>;

  fetchPriceLists?(
    credentials: Record<string, any>,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<PriceListFetchResult>;

  fetchProductPrices?(
    credentials: Record<string, any>,
    priceListId: number,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<ProductPriceFetchResult>;
}
