export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price_per_unit: number;
  unit: string;
  moq: number;
  origin: string;
  in_stock: boolean;
  image: string;
  tags: string[];
  weight: number | null;
  barcode: string | null;
  brand: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  name_th: string;
  description_th: string;
  orderwise_id: number | null;
  external_id: string | null;
  last_synced_at: string | null;
  supplier_code: string | null;
  manufacturer_code: string | null;
  stock_level: number;
  cost_price: number | null;
  metadata: Record<string, any>;
}

export interface ProductPriceList {
  id: string;
  name: string;
  external_id: string;
  orderwise_id: number | null;
  description: string | null;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductPrice {
  id: string;
  product_id: string;
  price_list_id: string;
  price: number;
  currency: string;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSyncLog {
  id: string;
  erp_destination_id: string;
  sync_type: 'manual' | 'scheduled';
  status: 'running' | 'completed' | 'failed';
  products_fetched: number;
  products_created: number;
  products_updated: number;
  products_skipped: number;
  prices_fetched: number;
  prices_updated: number;
  error_message: string | null;
  error_details: Record<string, any> | null;
  started_at: string;
  completed_at: string | null;
  last_modified_since: string | null;
  created_at: string;
}

export interface ProductSyncItem {
  id: string;
  sync_log_id: string;
  product_id: string | null;
  external_id: string;
  action: 'created' | 'updated' | 'skipped';
  product_snapshot: Record<string, any>;
  error_message: string | null;
  created_at: string;
}

export interface OrderwiseProduct {
  id: number;
  productCode: string;
  productName: string;
  description?: string;
  supplierCode?: string;
  manufacturerCode?: string;
  barcode?: string;
  weight?: number;
  category?: string;
  brand?: string;
  unitOfMeasure?: string;
  minimumOrderQuantity?: number;
  costPrice?: number;
  sellPrice?: number;
  stockLevel?: number;
  inStock?: boolean;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface OrderwisePriceList {
  id: number;
  name: string;
  description?: string;
  currency?: string;
  isDefault?: boolean;
}

export interface OrderwiseProductPrice {
  productId: number;
  productCode: string;
  priceListId: number;
  priceListName: string;
  price: number;
  currency: string;
}

export interface ProductFetchResult {
  success: boolean;
  products: OrderwiseProduct[];
  errorMessage?: string;
}

export interface PriceListFetchResult {
  success: boolean;
  priceLists: OrderwisePriceList[];
  errorMessage?: string;
}

export interface ProductPriceFetchResult {
  success: boolean;
  prices: OrderwiseProductPrice[];
  errorMessage?: string;
}
