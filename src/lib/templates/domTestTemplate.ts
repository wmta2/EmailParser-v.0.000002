/**
 * DOM-Based Test Template
 *
 * This template demonstrates how to parse HTML emails using DOM traversal
 * instead of regular expressions. It's more reliable for structured HTML.
 *
 * This is configured for a generic WooCommerce-style email layout but can
 * be easily adapted to match any HTML email structure.
 */

import { DOMEmailParser, parseCurrency, parseDate, type DOMParserConfig } from '../domEmailParser';

export interface DOMTestTemplateConfig {
  // You can customize these selectors to match your email structure
  selectors?: Partial<DOMParserConfig>;
}

/**
 * Default DOM parser configuration for WooCommerce-style emails
 */
const defaultConfig: DOMParserConfig = {
  // Order number - typically in the subject or a prominent heading
  orderNumber: {
    selector: 'h1, h2, .order-number, #order-number, [data-order-number]',
    transform: (value: string) => {
      // Extract just the number, removing any prefix like "Order #"
      const match = value.match(/#?(\d+)/);
      return match ? match[1] : value;
    },
  },

  // Requester/Customer name - often in billing or greeting
  requester: {
    selector: '.customer-name, .billing-name, .order-customer, h3',
    transform: (value: string) => {
      // Remove common prefixes like "Hello" or "Dear"
      return value.replace(/^(hello|dear|hi)\s+/i, '').trim();
    },
  },

  // Delivery address - using block parser for flexibility
  deliveryAddress: {
    blockSelector: '.shipping-address, .delivery-address, [data-shipping-address]',
    blockParser: (text: string) => {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);

      return {
        name: lines[0] || undefined,
        address1: lines[1] || undefined,
        address2: lines[2] || undefined,
        town: lines[3]?.split(',')[0]?.trim() || undefined,
        county: lines[3]?.split(',')[1]?.trim() || lines[4]?.split(',')[0]?.trim() || undefined,
        postcode: lines[4]?.match(/[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i)?.[0] || lines[5]?.match(/[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i)?.[0] || undefined,
        country: lines[lines.length - 1] || undefined,
      };
    },
  },

  // Billing address - using block parser
  billingAddress: {
    blockSelector: '.billing-address, [data-billing-address]',
    blockParser: (text: string) => {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);

      return {
        name: lines[0] || undefined,
        address1: lines[1] || undefined,
        address2: lines[2] || undefined,
        town: lines[3]?.split(',')[0]?.trim() || undefined,
        county: lines[3]?.split(',')[1]?.trim() || lines[4]?.split(',')[0]?.trim() || undefined,
        postcode: lines[4]?.match(/[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i)?.[0] || lines[5]?.match(/[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}/i)?.[0] || undefined,
        country: lines[lines.length - 1] || undefined,
      };
    },
  },

  // Order items table
  orderItems: {
    tableSelector: 'table.order-items, table.product-table, .order-details table, table[id*="order"]',
    rowSelector: 'tbody tr, .order-item',
    columns: {
      productName: {
        selector: 'td:nth-child(1), .product-name, .item-name',
      },
      productCode: {
        selector: 'td:nth-child(2), .product-code, .sku, .item-code',
        transform: (value: string) => value.replace(/SKU:\s*/i, '').trim(),
      },
      quantity: {
        selector: 'td:nth-child(3), .quantity, .qty',
        transform: (value: string) => {
          const num = value.replace(/[^\d.]/g, '');
          return parseFloat(num) || 1;
        },
      },
      unitPrice: {
        selector: 'td:nth-child(4), .unit-price, .price',
        transform: parseCurrency,
      },
      total: {
        selector: 'td:nth-child(5), td:last-child, .total, .line-total',
        transform: parseCurrency,
      },
    },
  },

  // Order notes
  notes: {
    selector: '.order-notes, .customer-notes, .special-instructions, [data-notes]',
  },
};

/**
 * Parse email using DOM-based approach
 */
export function parseWithDOM(htmlContent: string, config?: DOMTestTemplateConfig): {
  order: Record<string, any>;
  items: Array<Record<string, any>>;
} | null {
  try {
    // Merge custom config with defaults
    const parserConfig: DOMParserConfig = {
      ...defaultConfig,
      ...(config?.selectors || {}),
    };

    // Create parser and parse
    const parser = new DOMEmailParser(htmlContent);
    const result = parser.parse(parserConfig);

    // Validate that we got at least an order number and some items
    if (!result.order.order_number && result.items.length === 0) {
      console.warn('DOM parser: No order number or items found');
      return null;
    }

    return result;
  } catch (error) {
    console.error('DOM parsing error:', error);
    return null;
  }
}

/**
 * Detect if this template should be used for an email
 * This is a simple heuristic - customize as needed
 */
export function shouldUseDOMTemplate(htmlContent: string, textContent: string): boolean {
  // Use DOM template if the email has HTML and contains common order elements
  if (!htmlContent) return false;

  const hasOrderTable = /<table[^>]*>/i.test(htmlContent) &&
                        (htmlContent.includes('order') || htmlContent.includes('product'));

  const hasStructuredContent = /<div[^>]*class="[^"]*address[^"]*"/i.test(htmlContent) ||
                                /<div[^>]*class="[^"]*shipping[^"]*"/i.test(htmlContent);

  return hasOrderTable || hasStructuredContent;
}

/**
 * Custom configuration examples for different email providers
 */
export const configExamples = {
  // WooCommerce default email template
  woocommerce: {
    selectors: {
      orderNumber: {
        selector: 'h1',
        transform: (value: string) => value.match(/\d+/)?.[0] || value,
      },
      orderItems: {
        tableSelector: '#body_content_inner table',
        rowSelector: 'tbody tr',
        columns: {
          productName: { selector: 'td:nth-child(1)' },
          quantity: {
            selector: 'td:nth-child(2)',
            transform: (value: string) => parseFloat(value.replace(/[^\d.]/g, '')) || 1,
          },
          unitPrice: {
            selector: 'td:nth-child(3)',
            transform: parseCurrency,
          },
        },
      },
    },
  },

  // Shopify order email template
  shopify: {
    selectors: {
      orderNumber: {
        selector: '.order-number, h1',
        transform: (value: string) => value.replace(/Order #/i, '').trim(),
      },
      orderItems: {
        tableSelector: 'table.order-items',
        rowSelector: 'tr.order-item',
        columns: {
          productName: { selector: '.product-title' },
          productCode: { selector: '.product-sku' },
          quantity: {
            selector: '.quantity',
            transform: (value: string) => parseFloat(value) || 1,
          },
          unitPrice: {
            selector: '.price',
            transform: parseCurrency,
          },
        },
      },
    },
  },

  // Generic HTML email with simple structure
  generic: {
    selectors: {
      orderNumber: {
        selector: 'h1, h2, strong:contains("Order")',
      },
      deliveryAddress: {
        blockSelector: 'div:contains("Delivery Address"), div:contains("Shipping Address")',
      },
      orderItems: {
        tableSelector: 'table',
        rowSelector: 'tbody tr',
        columns: {
          productName: { selector: 'td:first-child' },
          quantity: {
            selector: 'td:nth-child(2)',
            transform: (value: string) => parseFloat(value.replace(/[^\d.]/g, '')) || 1,
          },
          unitPrice: {
            selector: 'td:nth-child(3)',
            transform: parseCurrency,
          },
          total: {
            selector: 'td:last-child',
            transform: parseCurrency,
          },
        },
      },
    },
  },
};
