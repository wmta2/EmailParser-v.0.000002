import type { Order, OrderItem, Customer } from '../supabase';
import { isValidProductCode } from '../textSanitizer';

export interface OrderwiseSalesOrder {
  customer: OrderwiseCustomer;
  orderHeader: OrderwiseOrderHeader;
  customerDeliveryAddress: OrderwiseDeliveryAddress;
  orderLines: OrderwiseOrderLine[];
}

interface ParsedFullAddress {
  address1?: string;
  address2?: string;
  town?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

function parseFullAddress(fullAddress: string | null | undefined): ParsedFullAddress {
  if (!fullAddress) return {};

  const parts = fullAddress.split(',').map(p => p.trim()).filter(p => p.length > 0);
  if (parts.length === 0) return {};

  const result: ParsedFullAddress = {};

  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

  const lastPart = parts[parts.length - 1];
  const lastPartTokens = lastPart.split(/\s+/);

  if (lastPartTokens.length >= 2) {
    const potentialPostcode = lastPartTokens.slice(-2).join(' ');
    if (postcodeRegex.test(potentialPostcode.replace(/\s+/g, ' '))) {
      result.postcode = potentialPostcode;
      const remaining = lastPartTokens.slice(0, -2).join(' ').trim();
      if (remaining) {
        result.town = remaining;
      }
      parts.pop();
    } else if (postcodeRegex.test(lastPart.replace(/\s+/g, ' '))) {
      result.postcode = lastPart;
      parts.pop();
    }
  } else if (postcodeRegex.test(lastPart.replace(/\s+/g, ' '))) {
    result.postcode = lastPart;
    parts.pop();
  }

  if (parts.length > 0 && !result.town) {
    const townCandidate = parts[parts.length - 1];
    if (!/^\d/.test(townCandidate) && !/^unit/i.test(townCandidate)) {
      result.town = townCandidate;
      parts.pop();
    }
  }

  if (parts.length > 0) {
    result.address1 = parts[0];
  }
  if (parts.length > 1) {
    result.address2 = parts[1];
  }

  return result;
}

export interface OrderwiseCustomer {
  accountNumber: string;
}

export interface OrderwiseDeliveryAddress {
  deliveryName?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  town?: string;
  county?: string;
  country?: string;
  countryCode?: string;
  postcode?: string;
  email?: string;
  telephone?: string;
}

export interface OrderwiseOrderHeader {
  orderDate: string;
  eCommerceOrderNumber: string;
  requiredDate?: string;
  specialInstructions?: string;
  systemOrderType: number;
}

export interface OrderwiseOrderLine {
  quantity: number;
  variantCode?: string;
  calculateLineSystemPrice: true;
}

export interface MappingConfig {
  systemOrderType?: number;
  orderType?: number;
  deliveryMethodId?: number;
  taxRateId?: number;
  stockLocationId?: number;
  currencyId?: number;
  paymentMethodId?: number;
  pricesAsNet?: boolean;
}

export interface MapOrderOptions {
  filterByExportFlag?: boolean;
}

export function mapOrderToOrderwise(
  order: Order,
  items: OrderItem[],
  customer: Customer | null,
  mappingConfig: MappingConfig,
  options: MapOrderOptions = {}
): OrderwiseSalesOrder {
  const { filterByExportFlag = true } = options;

  const owCustomer: OrderwiseCustomer = {
    accountNumber: customer?.external_id || '',
  };

  const parsedFullAddress = parseFullAddress(order.full_address);

  const hasOrderAddress = !!(
    order.delivery_address1 || order.delivery_town || order.delivery_postcode
  );
  const hasParsedAddress = !!(
    parsedFullAddress.address1 || parsedFullAddress.town || parsedFullAddress.postcode
  );

  let address1: string | undefined;
  let address2: string | undefined;
  let address3: string | undefined;
  let town: string | undefined;
  let county: string | undefined;
  let country: string | undefined;
  let countryCode: string | undefined;
  let postcode: string | undefined;

  if (hasOrderAddress) {
    address1 = order.delivery_address1 || undefined;
    address2 = order.delivery_address2 || undefined;
    address3 = order.delivery_address3 || undefined;
    town = order.delivery_town || undefined;
    county = order.delivery_county || undefined;
    country = order.delivery_country || undefined;
    countryCode = order.delivery_country_code || undefined;
    postcode = order.delivery_postcode || undefined;

    if (!town && parsedFullAddress.town) {
      town = parsedFullAddress.town;
    }
    if (!county && parsedFullAddress.county) {
      county = parsedFullAddress.county;
    }
    if (!country && parsedFullAddress.country) {
      country = parsedFullAddress.country;
    }
    if (!postcode && parsedFullAddress.postcode) {
      postcode = parsedFullAddress.postcode;
    }
    if (!address1 && parsedFullAddress.address1) {
      address1 = parsedFullAddress.address1;
    }
    if (!address2 && parsedFullAddress.address2) {
      address2 = parsedFullAddress.address2;
    }
  } else if (hasParsedAddress) {
    address1 = parsedFullAddress.address1;
    address2 = parsedFullAddress.address2;
    town = parsedFullAddress.town;
    county = parsedFullAddress.county;
    country = parsedFullAddress.country;
    postcode = parsedFullAddress.postcode;
  } else if (customer) {
    address1 = customer.shipping_address1 || undefined;
    address2 = customer.shipping_address2 || undefined;
    address3 = customer.shipping_address3 || undefined;
    town = customer.shipping_town || undefined;
    county = customer.shipping_county || undefined;
    country = customer.shipping_country || undefined;
    countryCode = customer.shipping_country_code || undefined;
    postcode = customer.shipping_postcode || undefined;
  }

  const owDeliveryAddress: OrderwiseDeliveryAddress = {
    deliveryName: order.delivery_name || customer?.name || order.requester || '',
    address1,
    address2,
    address3,
    town,
    county,
    country,
    countryCode,
    postcode,
    email: order.delivery_email || customer?.shipping_email || customer?.email || undefined,
    telephone: order.delivery_telephone || customer?.shipping_telephone || customer?.phone || undefined,
  };

  const owHeader: OrderwiseOrderHeader = {
    orderDate: order.created_at,
    eCommerceOrderNumber: order.order_number || '',
    ...(order.required_date && { requiredDate: order.required_date }),
    specialInstructions: order.notes || undefined,
    systemOrderType: mappingConfig.systemOrderType ?? 2,
  };

  const itemsToExport = filterByExportFlag
    ? items.filter(item => item.export_to_erp)
    : items;

  const owLines: OrderwiseOrderLine[] = itemsToExport
    .filter(item => {
      const code = item.sku || item.product_code;
      const isValid = code && isValidProductCode(code);
      if (!isValid) {
        console.warn('Skipping order item with invalid product code/SKU for export:', {
          product_name: item.product_name,
          product_code: item.product_code,
          sku: item.sku,
          order_id: order.id
        });
      }
      return isValid;
    })
    .map(item => ({
      quantity: item.quantity,
      variantCode: item.sku || item.product_code || undefined,
      calculateLineSystemPrice: true,
    }));

  return {
    customer: owCustomer,
    orderHeader: owHeader,
    customerDeliveryAddress: owDeliveryAddress,
    orderLines: owLines,
  };
}
