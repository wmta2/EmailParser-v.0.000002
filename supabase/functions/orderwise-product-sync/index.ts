import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderwiseProduct {
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
  metadata?: any;
}

interface OrderwisePriceList {
  id: number;
  name: string;
  description?: string;
  currency?: string;
  isDefault?: boolean;
}

interface OrderwiseProductPrice {
  productId: number;
  productCode: string;
  priceListId: number;
  priceListName: string;
  price: number;
  currency: string;
}

async function authenticateOrderwise(
  baseUrl: string,
  username: string,
  password: string,
  environment: string
): Promise<string> {
  let domain = baseUrl.replace(/\/+$/, '');
  domain = domain.replace(/\/(OWAPI|OWAPISB)$/i, '');
  const apiPath = environment === 'live' ? '/OWAPI' : '/OWAPISB';
  const authUrl = `${domain}${apiPath}/token/gettoken`;

  const encoded = btoa(`${username}:${password}`);

  const response = await fetch(authUrl, {
    method: 'GET',
    headers: { 'Authorization': `Basic ${encoded}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Authentication failed (${response.status}): ${text}`);
  }

  const text = await response.text();
  return text.replace(/^"|"$/g, '');
}

async function fetchProductsFromOrderwise(
  baseUrl: string,
  token: string,
  environment: string,
  modifiedSince?: string
): Promise<OrderwiseProduct[]> {
  const apiPath = environment === 'live' ? '/OWAPI' : '/OWAPISB';
  let url = `${baseUrl}${apiPath}/products`;

  if (modifiedSince) {
    url += `?lastAmendedDateTime=${encodeURIComponent(modifiedSince)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch products (${response.status}): ${text}`);
  }

  const data = await response.json();
  const products = Array.isArray(data) ? data : [];

  return products.map((item: any): OrderwiseProduct => ({
    id: item.id || item.Id || item.productId,
    productCode: String(item.productCode || item.ProductCode || item.code || ''),
    productName: String(item.productName || item.ProductName || item.name || ''),
    description: item.description || item.Description || '',
    supplierCode: item.supplierCode || item.SupplierCode || '',
    manufacturerCode: item.manufacturerCode || item.ManufacturerCode || '',
    barcode: item.barcode || item.Barcode || '',
    weight: item.weight || item.Weight || 0,
    category: item.category || item.Category || '',
    brand: item.brand || item.Brand || '',
    unitOfMeasure: item.unitOfMeasure || item.UnitOfMeasure || item.uom || '',
    minimumOrderQuantity: item.minimumOrderQuantity || item.MinimumOrderQuantity || item.moq || 1,
    costPrice: item.costPrice || item.CostPrice || 0,
    sellPrice: item.sellPrice || item.SellPrice || item.price || 0,
    stockLevel: item.stockLevel || item.StockLevel || item.stock || 0,
    inStock: item.inStock !== false && item.InStock !== false,
    isActive: item.isActive !== false && item.IsActive !== false,
    metadata: item,
  })).filter((p: OrderwiseProduct) => p.productCode);
}

async function fetchPriceListsFromOrderwise(
  baseUrl: string,
  token: string,
  environment: string
): Promise<OrderwisePriceList[]> {
  const apiPath = environment === 'live' ? '/OWAPI' : '/OWAPISB';
  const url = `${baseUrl}${apiPath}/value-lists/56`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch price lists (${response.status}): ${text}`);
  }

  const data = await response.json();
  const priceLists = Array.isArray(data) ? data : [];

  return priceLists.map((item: any): OrderwisePriceList => ({
    id: item.id || item.Id,
    name: String(item.name || item.Name || ''),
    description: item.description || item.Description || '',
    currency: item.currency || 'GBP',
    isDefault: item.isDefault === true || item.default === true,
  })).filter((p: OrderwisePriceList) => p.id);
}

async function fetchProductPricesFromOrderwise(
  baseUrl: string,
  token: string,
  environment: string,
  priceListId: number
): Promise<OrderwiseProductPrice[]> {
  const apiPath = environment === 'live' ? '/OWAPI' : '/OWAPISB';
  const url = `${baseUrl}${apiPath}/product-prices?priceListId=${priceListId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch prices (${response.status}): ${text}`);
  }

  const data = await response.json();
  const prices = Array.isArray(data) ? data : [];

  return prices.map((item: any): OrderwiseProductPrice => ({
    productId: item.productId || item.ProductId,
    productCode: String(item.productCode || item.ProductCode || ''),
    priceListId: item.priceListId || item.PriceListId || priceListId,
    priceListName: String(item.priceListName || item.PriceListName || ''),
    price: item.price || item.Price || 0,
    currency: item.currency || item.Currency || 'GBP',
  })).filter((p: OrderwiseProductPrice) => p.productCode);
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { erpDestinationId } = await req.json();

    if (!erpDestinationId) {
      throw new Error("Missing erpDestinationId");
    }

    const { data: erpConfig, error: configError } = await supabase
      .from("erp_configurations")
      .select("credentials")
      .eq("erp_destination_id", erpDestinationId)
      .single();

    if (configError || !erpConfig) {
      throw new Error("ERP configuration not found");
    }

    const { base_url, username, password, environment } = erpConfig.credentials;

    if (!base_url || !username || !password) {
      throw new Error("Invalid credentials configuration");
    }

    const { data: syncLog, error: logError } = await supabase
      .from("product_sync_log")
      .insert({
        erp_destination_id: erpDestinationId,
        sync_type: 'manual',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError || !syncLog) {
      throw new Error("Failed to create sync log");
    }

    const authToken = await authenticateOrderwise(base_url, username, password, environment);

    const products = await fetchProductsFromOrderwise(base_url, authToken, environment);

    let productsFetched = 0;
    let productsCreated = 0;
    let productsUpdated = 0;
    let productsSkipped = 0;

    for (const product of products) {
      productsFetched++;

      if (!product.productCode || !product.productName) {
        productsSkipped++;
        await supabase.from("product_sync_items").insert({
          sync_log_id: syncLog.id,
          external_id: product.productCode || `unknown_${product.id}`,
          action: 'skipped',
          product_snapshot: product,
          error_message: 'Missing product code or name',
        });
        continue;
      }

      const { data: existingProduct } = await supabase
        .from("products")
        .select("id")
        .eq("external_id", product.productCode)
        .maybeSingle();

      const productData = {
        sku: product.productCode,
        name: product.productName,
        slug: generateSlug(product.productName),
        category: product.category || 'Uncategorized',
        description: product.description || '',
        price_per_unit: product.sellPrice || 0,
        unit: product.unitOfMeasure || '',
        moq: product.minimumOrderQuantity || 1,
        origin: '',
        in_stock: product.inStock !== false,
        barcode: product.barcode || null,
        brand: product.brand || null,
        weight: product.weight || null,
        is_active: product.isActive !== false,
        orderwise_id: product.id,
        external_id: product.productCode,
        supplier_code: product.supplierCode || null,
        manufacturer_code: product.manufacturerCode || null,
        stock_level: product.stockLevel || 0,
        cost_price: product.costPrice || null,
        metadata: product.metadata || {},
        last_synced_at: new Date().toISOString(),
      };

      if (existingProduct) {
        const { error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", existingProduct.id);

        if (updateError) {
          productsSkipped++;
          await supabase.from("product_sync_items").insert({
            sync_log_id: syncLog.id,
            product_id: existingProduct.id,
            external_id: product.productCode,
            action: 'skipped',
            product_snapshot: product,
            error_message: updateError.message,
          });
        } else {
          productsUpdated++;
          await supabase.from("product_sync_items").insert({
            sync_log_id: syncLog.id,
            product_id: existingProduct.id,
            external_id: product.productCode,
            action: 'updated',
            product_snapshot: product,
          });
        }
      } else {
        const { data: newProduct, error: insertError } = await supabase
          .from("products")
          .insert(productData)
          .select("id")
          .single();

        if (insertError) {
          productsSkipped++;
          await supabase.from("product_sync_items").insert({
            sync_log_id: syncLog.id,
            external_id: product.productCode,
            action: 'skipped',
            product_snapshot: product,
            error_message: insertError.message,
          });
        } else {
          productsCreated++;
          await supabase.from("product_sync_items").insert({
            sync_log_id: syncLog.id,
            product_id: newProduct.id,
            external_id: product.productCode,
            action: 'created',
            product_snapshot: product,
          });
        }
      }
    }

    const priceLists = await fetchPriceListsFromOrderwise(base_url, authToken, environment);
    let pricesFetched = 0;
    let pricesUpdated = 0;

    for (const priceList of priceLists) {
      const { data: existingPriceList } = await supabase
        .from("product_price_lists")
        .select("id")
        .eq("external_id", String(priceList.id))
        .maybeSingle();

      const priceListData = {
        name: priceList.name,
        external_id: String(priceList.id),
        orderwise_id: priceList.id,
        description: priceList.description || null,
        currency: priceList.currency || 'GBP',
        is_default: priceList.isDefault || false,
        is_active: true,
      };

      if (existingPriceList) {
        await supabase
          .from("product_price_lists")
          .update(priceListData)
          .eq("id", existingPriceList.id);
      } else {
        await supabase
          .from("product_price_lists")
          .insert(priceListData);
      }

      const prices = await fetchProductPricesFromOrderwise(base_url, authToken, environment, priceList.id);

      for (const price of prices) {
        pricesFetched++;

        const { data: product } = await supabase
          .from("products")
          .select("id")
          .eq("external_id", price.productCode)
          .maybeSingle();

        if (!product) continue;

        const { data: priceListRecord } = await supabase
          .from("product_price_lists")
          .select("id")
          .eq("external_id", String(price.priceListId))
          .maybeSingle();

        if (!priceListRecord) continue;

        const { data: existingPrice } = await supabase
          .from("product_prices")
          .select("id")
          .eq("product_id", product.id)
          .eq("price_list_id", priceListRecord.id)
          .maybeSingle();

        const priceData = {
          product_id: product.id,
          price_list_id: priceListRecord.id,
          price: price.price,
          currency: price.currency,
        };

        if (existingPrice) {
          await supabase
            .from("product_prices")
            .update(priceData)
            .eq("id", existingPrice.id);
          pricesUpdated++;
        } else {
          await supabase
            .from("product_prices")
            .insert(priceData);
          pricesUpdated++;
        }
      }
    }

    await supabase
      .from("product_sync_log")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        products_fetched: productsFetched,
        products_created: productsCreated,
        products_updated: productsUpdated,
        products_skipped: productsSkipped,
        prices_fetched: pricesFetched,
        prices_updated: pricesUpdated,
      })
      .eq("id", syncLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        syncLogId: syncLog.id,
        summary: {
          products: {
            fetched: productsFetched,
            created: productsCreated,
            updated: productsUpdated,
            skipped: productsSkipped,
          },
          prices: {
            fetched: pricesFetched,
            updated: pricesUpdated,
          },
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Product sync error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
