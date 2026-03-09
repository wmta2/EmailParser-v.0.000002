import type {
  ErpAdapter,
  ErpFieldDefinition,
  ErpConnectionTestResult,
  OrderExportPayload,
  OrderExportResult,
  OrderStatusResult,
  ValueListItem,
  CustomerFetchResult,
  OrderwiseCustomer,
  DeliveryAddressFetchResult,
  OrderwiseDeliveryAddress,
  ApiRequestMetadata,
  ProductFetchResult,
  PriceListFetchResult,
  ProductPriceFetchResult,
} from './types';
import type { OrderwiseProduct, OrderwisePriceList, OrderwiseProductPrice } from '../types/product';
import { mapOrderToOrderwise, type MappingConfig } from './orderwiseMapping';
import { supabase } from '../supabase';

class OrderwiseApiError extends Error {
  responsePayload: Record<string, any>;
  apiMetadata?: ApiRequestMetadata;
  constructor(message: string, responsePayload: Record<string, any>, apiMetadata?: ApiRequestMetadata) {
    super(message);
    this.responsePayload = responsePayload;
    this.apiMetadata = apiMetadata;
  }
}

export class OrderwiseAdapter implements ErpAdapter {
  getConfigSchema(): ErpFieldDefinition[] {
    return [
      {
        key: 'base_url',
        label: 'Base Domain',
        type: 'text',
        required: true,
        placeholder: 'https://yourinstance.orderwisecloud.com',
        description: 'Your Orderwise instance domain (without /OWAPI or /OWAPISB path)',
        group: 'connection',
      },
      {
        key: 'username',
        label: 'Username',
        type: 'text',
        required: true,
        placeholder: 'API username',
        group: 'connection',
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: 'API password',
        group: 'connection',
      },
      {
        key: 'environment',
        label: 'Environment',
        type: 'text',
        required: false,
        placeholder: 'sandbox',
        description: 'API environment: "sandbox" (OWAPISB) or "live" (OWAPI)',
        group: 'connection',
      },
      {
        key: 'session_id',
        label: 'eCommerce Session ID',
        type: 'number',
        required: true,
        placeholder: 'e.g. 1',
        description: 'The eCommerce Session ID configured in your Orderwise instance',
        group: 'connection',
      },
      {
        key: 'system_order_type',
        label: 'System Order Type',
        type: 'number',
        required: false,
        placeholder: '1 = Order, 2 = Quote, 3 = Paused',
        description: 'Default system order type ID (1=Order, 2=Quote, 3=Paused, 4=Credit, 5=Schedule, 6=Bulk)',
        group: 'mapping',
      },
      {
        key: 'order_type_id',
        label: 'Order Type',
        type: 'number',
        required: false,
        placeholder: 'From value-lists/15',
        description: 'Order type ID from Orderwise value list 15',
        group: 'mapping',
      },
      {
        key: 'delivery_method_id',
        label: 'Delivery Method',
        type: 'number',
        required: false,
        placeholder: 'From value-lists/18',
        description: 'Default delivery method ID from Orderwise value list 18',
        group: 'mapping',
      },
      {
        key: 'tax_rate_id',
        label: 'Tax Rate',
        type: 'number',
        required: false,
        placeholder: 'From value-lists/2',
        description: 'Default tax rate ID from Orderwise value list 2',
        group: 'mapping',
      },
      {
        key: 'stock_location_id',
        label: 'Stock Location',
        type: 'number',
        required: false,
        placeholder: 'From value-lists/4',
        description: 'Default stock location ID from Orderwise value list 4',
        group: 'mapping',
      },
      {
        key: 'currency_id',
        label: 'Currency',
        type: 'number',
        required: false,
        placeholder: 'From value-lists/1',
        description: 'Default currency ID from Orderwise value list 1',
        group: 'mapping',
      },
      {
        key: 'payment_method_id',
        label: 'Payment Method',
        type: 'number',
        required: false,
        placeholder: 'From value-lists/20',
        description: 'Default payment method ID from Orderwise value list 20',
        group: 'mapping',
      },
      {
        key: 'prices_as_net',
        label: 'Prices as Net',
        type: 'boolean',
        required: false,
        description: 'Whether order prices should be sent as net (excluding tax) values',
        group: 'mapping',
      },
    ];
  }

  private async proxyRequest(
    credentials: Record<string, any>,
    action: 'test-auth' | 'api-request',
    options?: {
      method?: string;
      path?: string;
      body?: Record<string, any>;
      queryParams?: Record<string, string>;
      environment?: 'live' | 'sandbox';
      erpDestinationId?: string;
      erpConfigurationId?: string;
      captureMetadata?: boolean;
    }
  ): Promise<any> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const { data: { session } } = await supabase.auth.getSession();

    const startTime = Date.now();

    const response = await fetch(
      `${supabaseUrl}/functions/v1/orderwise-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          action,
          credentials: {
            base_url: credentials.base_url,
            username: credentials.username,
            password: credentials.password,
          },
          environment: options?.environment || credentials.environment || 'sandbox',
          ...options,
        }),
      }
    );

    const durationMs = Date.now() - startTime;
    const result = await response.json();

    const buildMetadata = (): ApiRequestMetadata => {
      if (result.metadata) {
        return {
          httpMethod: result.metadata.httpMethod || options?.method || 'GET',
          endpoint: result.metadata.endpoint || '',
          requestHeaders: result.metadata.requestHeaders || {},
          responseHeaders: result.metadata.responseHeaders,
          responseBody: result.metadata.responseBody ?? result.responseBody ?? result.data,
          durationMs: result.metadata.durationMs || durationMs,
        };
      }
      const env = options?.environment || credentials.environment || 'sandbox';
      const apiPath = env === 'sandbox' ? '/OWAPISB' : '/OWAPI';
      const baseUrl = credentials.base_url?.replace(/\/$/, '') || '';
      let fullEndpoint = `${baseUrl}${apiPath}${options?.path || ''}`;
      if (options?.queryParams && Object.keys(options.queryParams).length > 0) {
        const qs = new URLSearchParams(options.queryParams).toString();
        fullEndpoint += `?${qs}`;
      }
      return {
        httpMethod: options?.method || 'GET',
        endpoint: fullEndpoint,
        requestHeaders: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer [REDACTED]',
        },
        responseBody: result.responseBody ?? result.data,
        durationMs,
      };
    };

    if (!result.ok) {
      const responsePayload: Record<string, any> = {
        http_status: result.status,
        error: result.error,
      };
      if (result.responseBody != null) {
        responsePayload.body = result.responseBody;
      } else if (result.details != null) {
        responsePayload.body = result.details;
      }
      const metadata = buildMetadata();
      throw new OrderwiseApiError(result.error || 'Proxy request failed', responsePayload, metadata);
    }

    if (options?.captureMetadata) {
      const metadata = buildMetadata();
      return { data: result.data, metadata };
    }

    return result.data;
  }

  private async apiRequest(
    credentials: Record<string, any>,
    method: string,
    path: string,
    body?: Record<string, any>,
    queryParams?: Record<string, string>,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<any> {
    const filteredParams = queryParams && Object.keys(queryParams).length > 0 ? queryParams : undefined;
    return this.proxyRequest(credentials, 'api-request', {
      method,
      path,
      body,
      queryParams: filteredParams,
      environment: credentials.environment || 'sandbox',
      erpDestinationId,
      erpConfigurationId,
    });
  }

  async testConnection(
    _config: Record<string, any>,
    credentials: Record<string, any>,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<ErpConnectionTestResult> {
    try {
      await this.proxyRequest(credentials, 'test-auth', {
        environment: credentials.environment || 'sandbox',
        erpDestinationId,
        erpConfigurationId,
      });

      try {
        await this.apiRequest(
          credentials,
          'GET',
          '/system/stock-locations',
          undefined,
          undefined,
          erpDestinationId,
          erpConfigurationId
        );
      } catch {
        return {
          success: true,
          message: 'Authentication successful. Note: could not verify API access to stock locations.',
        };
      }

      return {
        success: true,
        message: 'Connected to Orderwise successfully. Authentication and API access verified.',
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }

  async exportOrder(
    config: Record<string, any>,
    credentials: Record<string, any>,
    payload: OrderExportPayload
  ): Promise<OrderExportResult> {
    const mappingConfig: MappingConfig = {
      systemOrderType: config.system_order_type ? Number(config.system_order_type) : 1,
      orderType: config.order_type_id ? Number(config.order_type_id) : undefined,
      deliveryMethodId: config.delivery_method_id ? Number(config.delivery_method_id) : undefined,
      taxRateId: config.tax_rate_id ? Number(config.tax_rate_id) : undefined,
      stockLocationId: config.stock_location_id ? Number(config.stock_location_id) : undefined,
      currencyId: config.currency_id ? Number(config.currency_id) : undefined,
      paymentMethodId: config.payment_method_id ? Number(config.payment_method_id) : undefined,
      pricesAsNet: config.prices_as_net === true || config.prices_as_net === 'true',
    };

    const owOrder = mapOrderToOrderwise(
      payload.order,
      payload.items,
      payload.customer,
      mappingConfig
    );

    try {
      const sessionId = config.session_id || credentials.session_id;
      if (!sessionId) {
        return {
          success: false,
          errorMessage: 'eCommerce Session ID is required',
          requestPayload: owOrder,
          responsePayload: {},
        };
      }

      const response = await this.apiRequest(
        credentials,
        'POST',
        '/sales/order',
        owOrder,
        { session_id: String(sessionId) }
      );

      return {
        success: true,
        externalOrderId: response.orderId ? String(response.orderId) : undefined,
        externalOrderNumber: response.orderNumber || response.eCommerceOrderNumber || undefined,
        requestPayload: owOrder,
        responsePayload: response,
      };
    } catch (err) {
      return {
        success: false,
        errorMessage: err instanceof Error ? err.message : 'Export failed',
        requestPayload: owOrder,
        responsePayload: err instanceof OrderwiseApiError ? err.responsePayload : {},
      };
    }
  }

  async exportOrders(
    config: Record<string, any>,
    credentials: Record<string, any>,
    payloads: OrderExportPayload[]
  ): Promise<OrderExportResult[]> {
    const results: OrderExportResult[] = [];
    for (const payload of payloads) {
      const result = await this.exportOrder(config, credentials, payload);
      results.push(result);
    }
    return results;
  }

  async getOrderStatus(
    _config: Record<string, any>,
    credentials: Record<string, any>,
    externalOrderId: string
  ): Promise<OrderStatusResult> {
    const response = await this.apiRequest(
      credentials,
      'GET',
      `/sales/order/${externalOrderId}/status`,
      undefined,
      { include_lines: 'true', include_delivery: 'true' }
    );

    return {
      orderNumber: response.orderNumber || '',
      eCommerceOrderNumber: response.eCommerceOrderNumber || '',
      orderStatus: response.orderStatus || '',
      subStatus: response.subStatus || '',
    };
  }

  async fetchValueList(
    credentials: Record<string, any>,
    listId: number,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<ValueListItem[]> {
    const response = await this.apiRequest(
      credentials,
      'GET',
      `/value-lists/${listId}`,
      undefined,
      undefined,
      erpDestinationId,
      erpConfigurationId
    );

    if (Array.isArray(response)) {
      return response.map((item: any) => ({
        id: item.id ?? item.Id,
        name: item.name ?? item.Name ?? item.description ?? item.Description ?? `ID: ${item.id ?? item.Id}`,
      }));
    }

    return [];
  }

  async fetchCustomers(
    credentials: Record<string, any>,
    erpDestinationId?: string,
    erpConfigurationId?: string,
    lastModifiedSince?: string
  ): Promise<CustomerFetchResult> {
    try {
      const queryParams: Record<string, string> = {};
      if (lastModifiedSince) {
        queryParams['lastAmendedDateTime'] = lastModifiedSince;
      }

      const response = await this.apiRequest(
        credentials,
        'GET',
        '/Customers',
        undefined,
        Object.keys(queryParams).length > 0 ? queryParams : undefined,
        erpDestinationId,
        erpConfigurationId
      );

      if (!Array.isArray(response)) {
        return {
          success: false,
          customers: [],
          errorMessage: 'Invalid response format from Orderwise API',
        };
      }

      const customers: OrderwiseCustomer[] = response.map((item: any) => ({
        id: item.id != null ? Number(item.id) : undefined,
        accountNumber: String(item.accountNumber || ''),
        name: item.statementName || item.name || '',
        email: item.statementEmail || item.email || undefined,
        phone: item.statementTelephone || item.phone || undefined,
        company: item.companyName || item.company || undefined,
        billingName: item.invoiceName || undefined,
        billingAddress1: item.invoiceAddress1 || undefined,
        billingAddress2: item.invoiceAddress2 || undefined,
        billingAddress3: item.invoiceAddress3 || undefined,
        billingTown: item.invoiceTown || undefined,
        billingCounty: item.invoiceCounty || undefined,
        billingPostcode: item.invoicePostcode || undefined,
        billingCountry: item.invoiceCountry || undefined,
        billingCountryCode: item.invoiceCountryCode || undefined,
        billingEmail: item.invoiceEmail || undefined,
        billingTelephone: item.invoiceTelephone || undefined,
        shippingName: item.statementName || undefined,
        shippingAddress1: item.statementAddress1 || undefined,
        shippingAddress2: item.statementAddress2 || undefined,
        shippingAddress3: item.statementAddress3 || undefined,
        shippingTown: item.statementTown || undefined,
        shippingCounty: item.statementCounty || undefined,
        shippingPostcode: item.statementPostcode || undefined,
        shippingCountry: item.statementCountry || undefined,
        shippingCountryCode: item.statementCountryCode || undefined,
        shippingEmail: item.statementEmail || undefined,
        shippingTelephone: item.statementTelephone || undefined,
        onHold: item.onHold === true,
        manualOnHold: item.manualOnHold === true,
        balance: item.balance != null ? Number(item.balance) : undefined,
        creditLimit: item.creditLimit != null ? Number(item.creditLimit) : undefined,
        availableToSpend: item.availableToSpend != null ? Number(item.availableToSpend) : undefined,
        openOrdersValue: item.openOrdersValue != null ? Number(item.openOrdersValue) : undefined,
        overCreditTerms: item.overCreditTerms === true,
        vatNumber: item.vatNumber || undefined,
        currencyId: item.currencyId != null ? Number(item.currencyId) : undefined,
        priceListId: item.priceListId != null ? Number(item.priceListId) : undefined,
        nominalCodeId: item.nominalCodeId != null ? Number(item.nominalCodeId) : undefined,
        defaultTaxCodeId: item.defaultTaxCodeId != null ? Number(item.defaultTaxCodeId) : undefined,
        lastAmendedDateTime: item.lastAmendedDateTime || undefined,
        metadata: item,
      }));

      return {
        success: true,
        customers: customers.filter(c => c.accountNumber),
      };
    } catch (err) {
      return {
        success: false,
        customers: [],
        errorMessage: err instanceof Error ? err.message : 'Failed to fetch customers',
      };
    }
  }

  async fetchCustomerDeliveryAddresses(
    credentials: Record<string, any>,
    orderwiseId: number,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<DeliveryAddressFetchResult> {
    try {
      const path = `/customers/${orderwiseId}/delivery-addresses`;
      const result = await this.proxyRequest(credentials, 'api-request', {
        method: 'GET',
        path,
        environment: credentials.environment || 'sandbox',
        erpDestinationId,
        erpConfigurationId,
        captureMetadata: true,
      });

      const response = result.data;
      const apiMetadata: ApiRequestMetadata = result.metadata;

      if (!Array.isArray(response)) {
        return {
          success: false,
          addresses: [],
          errorMessage: 'Invalid response format from Orderwise API',
          apiMetadata,
        };
      }

      const addresses: OrderwiseDeliveryAddress[] = response.map((item: any) => ({
        id: item.id ?? item.Id ?? item.addressId ?? item.deliveryAddressId,
        name: item.name || item.deliveryName || undefined,
        contactName: item.contactName || item.contact || undefined,
        address1: item.address1 || item.deliveryAddress1 || undefined,
        address2: item.address2 || item.deliveryAddress2 || undefined,
        address3: item.address3 || item.deliveryAddress3 || undefined,
        town: item.town || item.deliveryTown || undefined,
        county: item.county || item.deliveryCounty || undefined,
        postcode: item.postcode || item.deliveryPostcode || undefined,
        country: item.country || item.deliveryCountry || undefined,
        countryCode: item.countryCode || item.deliveryCountryCode || undefined,
        telephone: item.telephone || item.deliveryTelephone || undefined,
        email: item.email || item.deliveryEmail || undefined,
        isDefault: item.isDefault === true || item.default === true,
        metadata: item,
      }));

      return {
        success: true,
        addresses: addresses.filter(a => a.id != null),
        apiMetadata,
      };
    } catch (err) {
      const apiMetadata = (err instanceof OrderwiseApiError) ? err.apiMetadata : undefined;
      return {
        success: false,
        addresses: [],
        errorMessage: err instanceof Error ? err.message : 'Failed to fetch delivery addresses',
        apiMetadata,
      };
    }
  }

  async fetchProducts(
    credentials: Record<string, any>,
    erpDestinationId?: string,
    erpConfigurationId?: string,
    lastModifiedSince?: string
  ): Promise<ProductFetchResult> {
    try {
      const { base_url, username, password, environment } = credentials;
      if (!base_url || !username || !password) {
        return {
          success: false,
          products: [],
          errorMessage: 'Missing required credentials: base_url, username, and password are required',
        };
      }

      const apiPath = environment === 'sandbox' ? '/OWAPISB' : '/OWAPI';
      const url = `${base_url.replace(/\/$/, '')}${apiPath}/products`;

      const startTime = Date.now();
      const requestHeaders = {
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
      });

      const durationMs = Date.now() - startTime;
      const responseBody = await response.json();

      const apiMetadata: ApiRequestMetadata = {
        httpMethod: 'GET',
        endpoint: url,
        requestHeaders: { ...requestHeaders, 'Authorization': '[REDACTED]' },
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody,
        durationMs,
      };

      await this.logApiRequest(
        erpDestinationId,
        erpConfigurationId,
        'api_request',
        url,
        'GET',
        requestHeaders,
        null,
        response.status,
        Object.fromEntries(response.headers.entries()),
        responseBody,
        response.ok,
        response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
        durationMs
      );

      if (!response.ok) {
        throw new OrderwiseApiError(
          `Failed to fetch products: HTTP ${response.status}`,
          responseBody,
          apiMetadata
        );
      }

      const productArray = Array.isArray(responseBody) ? responseBody : [];
      const products: OrderwiseProduct[] = productArray.map((item: any) => ({
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
      }));

      return {
        success: true,
        products: products.filter(p => p.productCode),
      };
    } catch (err) {
      return {
        success: false,
        products: [],
        errorMessage: err instanceof Error ? err.message : 'Failed to fetch products',
      };
    }
  }

  async fetchPriceLists(
    credentials: Record<string, any>,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<PriceListFetchResult> {
    try {
      const { base_url, username, password, environment } = credentials;
      if (!base_url || !username || !password) {
        return {
          success: false,
          priceLists: [],
          errorMessage: 'Missing required credentials',
        };
      }

      const apiPath = environment === 'sandbox' ? '/OWAPISB' : '/OWAPI';
      const url = `${base_url.replace(/\/$/, '')}${apiPath}/value-lists/56`;

      const startTime = Date.now();
      const requestHeaders = {
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
      });

      const durationMs = Date.now() - startTime;
      const responseBody = await response.json();

      await this.logApiRequest(
        erpDestinationId,
        erpConfigurationId,
        'api_request',
        url,
        'GET',
        requestHeaders,
        null,
        response.status,
        Object.fromEntries(response.headers.entries()),
        responseBody,
        response.ok,
        response.ok ? null : `HTTP ${response.status}`,
        durationMs
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch price lists: HTTP ${response.status}`);
      }

      const priceListArray = Array.isArray(responseBody) ? responseBody : [];
      const priceLists: OrderwisePriceList[] = priceListArray.map((item: any) => ({
        id: item.id || item.Id,
        name: String(item.name || item.Name || ''),
        description: item.description || item.Description || '',
        currency: item.currency || 'GBP',
        isDefault: item.isDefault === true || item.default === true,
      }));

      return {
        success: true,
        priceLists: priceLists.filter(p => p.id),
      };
    } catch (err) {
      return {
        success: false,
        priceLists: [],
        errorMessage: err instanceof Error ? err.message : 'Failed to fetch price lists',
      };
    }
  }

  async fetchProductPrices(
    credentials: Record<string, any>,
    priceListId: number,
    erpDestinationId?: string,
    erpConfigurationId?: string
  ): Promise<ProductPriceFetchResult> {
    try {
      const { base_url, username, password, environment } = credentials;
      if (!base_url || !username || !password) {
        return {
          success: false,
          prices: [],
          errorMessage: 'Missing required credentials',
        };
      }

      const apiPath = environment === 'sandbox' ? '/OWAPISB' : '/OWAPI';
      const url = `${base_url.replace(/\/$/, '')}${apiPath}/product-prices?priceListId=${priceListId}`;

      const startTime = Date.now();
      const requestHeaders = {
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      const response = await fetch(url, {
        method: 'GET',
        headers: requestHeaders,
      });

      const durationMs = Date.now() - startTime;
      const responseBody = await response.json();

      await this.logApiRequest(
        erpDestinationId,
        erpConfigurationId,
        'api_request',
        url,
        'GET',
        requestHeaders,
        null,
        response.status,
        Object.fromEntries(response.headers.entries()),
        responseBody,
        response.ok,
        response.ok ? null : `HTTP ${response.status}`,
        durationMs
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch product prices: HTTP ${response.status}`);
      }

      const priceArray = Array.isArray(responseBody) ? responseBody : [];
      const prices: OrderwiseProductPrice[] = priceArray.map((item: any) => ({
        productId: item.productId || item.ProductId,
        productCode: String(item.productCode || item.ProductCode || ''),
        priceListId: item.priceListId || item.PriceListId || priceListId,
        priceListName: String(item.priceListName || item.PriceListName || ''),
        price: item.price || item.Price || 0,
        currency: item.currency || item.Currency || 'GBP',
      }));

      return {
        success: true,
        prices: prices.filter(p => p.productCode),
      };
    } catch (err) {
      return {
        success: false,
        prices: [],
        errorMessage: err instanceof Error ? err.message : 'Failed to fetch product prices',
      };
    }
  }
}
