/**
 * DOM-based HTML Email Parser
 *
 * This parser uses DOM traversal instead of regular expressions to extract
 * data from HTML emails. It's more reliable for structured HTML content.
 */

import { evaluateXPathAsString } from './domUtils';

export interface DOMParserConfig {
  orderNumber?: {
    selector: string;
    attribute?: string;
    transform?: (value: string) => string;
  };
  requester?: {
    selector: string;
    attribute?: string;
    transform?: (value: string) => string;
  };
  supplierCode?: {
    selector: string;
    attribute?: string;
    transform?: (value: string) => string;
  };
  requiredDate?: {
    selector: string;
    attribute?: string;
    transform?: (value: string) => string;
  };
  deliveryAddress?: {
    nameSelector?: string;
    address1Selector?: string;
    address2Selector?: string;
    address3Selector?: string;
    townSelector?: string;
    countySelector?: string;
    postcodeSelector?: string;
    countrySelector?: string;
    emailSelector?: string;
    telephoneSelector?: string;
    mobileSelector?: string;
    // Alternative: single selector for full address block
    blockSelector?: string;
    blockParser?: (text: string) => {
      name?: string;
      address1?: string;
      address2?: string;
      address3?: string;
      town?: string;
      county?: string;
      postcode?: string;
      country?: string;
      email?: string;
      telephone?: string;
      mobile?: string;
    };
  };
  billingAddress?: {
    nameSelector?: string;
    address1Selector?: string;
    address2Selector?: string;
    townSelector?: string;
    countySelector?: string;
    postcodeSelector?: string;
    countrySelector?: string;
    emailSelector?: string;
    telephoneSelector?: string;
    // Alternative: single selector for full address block
    blockSelector?: string;
    blockParser?: (text: string) => {
      name?: string;
      address1?: string;
      address2?: string;
      town?: string;
      county?: string;
      postcode?: string;
      country?: string;
      email?: string;
      telephone?: string;
    };
  };
  orderItems?: {
    tableSelector: string;
    rowSelector: string;
    columns: {
      productName?: { selector: string; attribute?: string };
      productCode?: { selector: string; attribute?: string };
      sku?: { selector: string; attribute?: string };
      quantity?: { selector: string; attribute?: string; transform?: (value: string) => number };
      unitPrice?: { selector: string; attribute?: string; transform?: (value: string) => number };
      tax?: { selector: string; attribute?: string; transform?: (value: string) => number };
      total?: { selector: string; attribute?: string; transform?: (value: string) => number };
    };
  };
  notes?: {
    selector: string;
    attribute?: string;
    transform?: (value: string) => string;
  };
}

export class DOMEmailParser {
  private doc: Document;

  constructor(htmlContent: string) {
    // Create a DOM parser
    const parser = new DOMParser();
    this.doc = parser.parseFromString(htmlContent, 'text/html');
  }

  /**
   * Extract text content from an element using XPath
   */
  private extractText(selector: string, attribute?: string): string | null {
    try {
      let normalizedSelector = selector.trim();
      if (normalizedSelector.startsWith('string(') && normalizedSelector.endsWith(')')) {
        normalizedSelector = normalizedSelector.slice(7, -1);
      }

      if (attribute) {
        try {
          const result = this.doc.evaluate(
            normalizedSelector,
            this.doc,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          const node = result.singleNodeValue;
          if (node && node.nodeType === Node.ELEMENT_NODE) {
            return (node as Element).getAttribute(attribute);
          }
        } catch {
          // fall through to string evaluation
        }
      }

      return evaluateXPathAsString(this.doc, normalizedSelector);
    } catch (error) {
      console.error(`Error extracting text from XPath "${selector}":`, error);
      return null;
    }
  }

  /**
   * Extract all matching elements using XPath
   */
  private extractAll(selector: string): Node[] {
    try {
      const result = this.doc.evaluate(
        selector,
        this.doc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      const nodes: Node[] = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node) nodes.push(node);
      }

      return nodes;
    } catch (error) {
      console.error(`Error extracting elements from XPath "${selector}":`, error);
      return [];
    }
  }

  /**
   * Parse email using DOM-based configuration
   */
  parse(config: DOMParserConfig): {
    order: Record<string, any>;
    items: Array<Record<string, any>>;
  } {
    const order: Record<string, any> = {};
    const items: Array<Record<string, any>> = [];

    // Extract order number
    if (config.orderNumber) {
      const value = this.extractText(config.orderNumber.selector, config.orderNumber.attribute);
      if (value) {
        order.order_number = config.orderNumber.transform
          ? config.orderNumber.transform(value)
          : value;
      }
    }

    // Extract requester
    if (config.requester) {
      const value = this.extractText(config.requester.selector, config.requester.attribute);
      if (value) {
        order.requester = config.requester.transform
          ? config.requester.transform(value)
          : value;
      }
    }

    // Extract supplier code
    if (config.supplierCode) {
      const value = this.extractText(config.supplierCode.selector, config.supplierCode.attribute);
      if (value) {
        order.supplier_code = config.supplierCode.transform
          ? config.supplierCode.transform(value)
          : value;
      }
    }

    // Extract required date
    if (config.requiredDate) {
      const value = this.extractText(config.requiredDate.selector, config.requiredDate.attribute);
      if (value) {
        order.required_date = config.requiredDate.transform
          ? config.requiredDate.transform(value)
          : value;
      }
    }

    // Extract delivery address
    if (config.deliveryAddress) {
      if (config.deliveryAddress.blockSelector && config.deliveryAddress.blockParser) {
        // Use block parser for full address
        const blockText = this.extractText(config.deliveryAddress.blockSelector);
        if (blockText) {
          const parsed = config.deliveryAddress.blockParser(blockText);
          if (parsed.name) order.delivery_name = parsed.name;
          if (parsed.address1) order.delivery_address1 = parsed.address1;
          if (parsed.address2) order.delivery_address2 = parsed.address2;
          if (parsed.address3) order.delivery_address3 = parsed.address3;
          if (parsed.town) order.delivery_town = parsed.town;
          if (parsed.county) order.delivery_county = parsed.county;
          if (parsed.postcode) order.delivery_postcode = parsed.postcode;
          if (parsed.country) order.delivery_country = parsed.country;
          if (parsed.email) order.delivery_email = parsed.email;
          if (parsed.telephone) order.delivery_telephone = parsed.telephone;
          if (parsed.mobile) order.delivery_mobile = parsed.mobile;
        }
      } else {
        // Use individual selectors
        if (config.deliveryAddress.nameSelector) {
          const value = this.extractText(config.deliveryAddress.nameSelector);
          if (value) order.delivery_name = value;
        }
        if (config.deliveryAddress.address1Selector) {
          const value = this.extractText(config.deliveryAddress.address1Selector);
          if (value) order.delivery_address1 = value;
        }
        if (config.deliveryAddress.address2Selector) {
          const value = this.extractText(config.deliveryAddress.address2Selector);
          if (value) order.delivery_address2 = value;
        }
        if (config.deliveryAddress.address3Selector) {
          const value = this.extractText(config.deliveryAddress.address3Selector);
          if (value) order.delivery_address3 = value;
        }
        if (config.deliveryAddress.townSelector) {
          const value = this.extractText(config.deliveryAddress.townSelector);
          if (value) order.delivery_town = value;
        }
        if (config.deliveryAddress.countySelector) {
          const value = this.extractText(config.deliveryAddress.countySelector);
          if (value) order.delivery_county = value;
        }
        if (config.deliveryAddress.postcodeSelector) {
          const value = this.extractText(config.deliveryAddress.postcodeSelector);
          if (value) order.delivery_postcode = value;
        }
        if (config.deliveryAddress.countrySelector) {
          const value = this.extractText(config.deliveryAddress.countrySelector);
          if (value) order.delivery_country = value;
        }
        if (config.deliveryAddress.emailSelector) {
          const value = this.extractText(config.deliveryAddress.emailSelector);
          if (value) order.delivery_email = value;
        }
        if (config.deliveryAddress.telephoneSelector) {
          const value = this.extractText(config.deliveryAddress.telephoneSelector);
          if (value) order.delivery_telephone = value;
        }
        if (config.deliveryAddress.mobileSelector) {
          const value = this.extractText(config.deliveryAddress.mobileSelector);
          if (value) order.delivery_mobile = value;
        }
      }
    }

    // Extract billing address
    if (config.billingAddress) {
      if (config.billingAddress.blockSelector && config.billingAddress.blockParser) {
        const blockText = this.extractText(config.billingAddress.blockSelector);
        if (blockText) {
          const parsed = config.billingAddress.blockParser(blockText);
          if (parsed.name) order.billing_name = parsed.name;
          if (parsed.address1) order.billing_address1 = parsed.address1;
          if (parsed.address2) order.billing_address2 = parsed.address2;
          if (parsed.town) order.billing_town = parsed.town;
          if (parsed.county) order.billing_county = parsed.county;
          if (parsed.postcode) order.billing_postcode = parsed.postcode;
          if (parsed.country) order.billing_country = parsed.country;
          if (parsed.email) order.billing_email = parsed.email;
          if (parsed.telephone) order.billing_telephone = parsed.telephone;
        }
      } else {
        if (config.billingAddress.nameSelector) {
          const value = this.extractText(config.billingAddress.nameSelector);
          if (value) order.billing_name = value;
        }
        if (config.billingAddress.address1Selector) {
          const value = this.extractText(config.billingAddress.address1Selector);
          if (value) order.billing_address1 = value;
        }
        if (config.billingAddress.address2Selector) {
          const value = this.extractText(config.billingAddress.address2Selector);
          if (value) order.billing_address2 = value;
        }
        if (config.billingAddress.townSelector) {
          const value = this.extractText(config.billingAddress.townSelector);
          if (value) order.billing_town = value;
        }
        if (config.billingAddress.countySelector) {
          const value = this.extractText(config.billingAddress.countySelector);
          if (value) order.billing_county = value;
        }
        if (config.billingAddress.postcodeSelector) {
          const value = this.extractText(config.billingAddress.postcodeSelector);
          if (value) order.billing_postcode = value;
        }
        if (config.billingAddress.countrySelector) {
          const value = this.extractText(config.billingAddress.countrySelector);
          if (value) order.billing_country = value;
        }
        if (config.billingAddress.emailSelector) {
          const value = this.extractText(config.billingAddress.emailSelector);
          if (value) order.billing_email = value;
        }
        if (config.billingAddress.telephoneSelector) {
          const value = this.extractText(config.billingAddress.telephoneSelector);
          if (value) order.billing_telephone = value;
        }
      }
    }

    // Extract order items using XPath
    if (config.orderItems) {
      const tableResult = this.doc.evaluate(
        config.orderItems.tableSelector,
        this.doc,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const table = tableResult.singleNodeValue;

      if (table) {
        const rowsResult = this.doc.evaluate(
          config.orderItems.rowSelector,
          table,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );

        for (let i = 0; i < rowsResult.snapshotLength; i++) {
          const row = rowsResult.snapshotItem(i);
          if (!row) continue;

          const item: Record<string, any> = {};

          // Extract product name
          if (config.orderItems.columns.productName) {
            const result = this.doc.evaluate(
              config.orderItems.columns.productName.selector,
              row,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            const node = result.singleNodeValue;
            if (node) {
              const value = config.orderItems.columns.productName.attribute && node.nodeType === Node.ELEMENT_NODE
                ? (node as Element).getAttribute(config.orderItems.columns.productName.attribute)
                : node.textContent?.trim();
              if (value) item.product_name = value;
            }
          }

          // Extract product code
          if (config.orderItems.columns.productCode) {
            const result = this.doc.evaluate(
              config.orderItems.columns.productCode.selector,
              row,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            const node = result.singleNodeValue;
            if (node) {
              const rawValue = config.orderItems.columns.productCode.attribute && node.nodeType === Node.ELEMENT_NODE
                ? (node as Element).getAttribute(config.orderItems.columns.productCode.attribute)
                : node.textContent?.trim();
              if (rawValue) {
                const value = config.orderItems.columns.productCode.transform
                  ? config.orderItems.columns.productCode.transform(rawValue)
                  : rawValue;
                item.product_code = value.trim();
              }
            }
          }

          // Extract SKU
          if (config.orderItems.columns.sku) {
            const result = this.doc.evaluate(
              config.orderItems.columns.sku.selector,
              row,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            const node = result.singleNodeValue;
            if (node) {
              const rawValue = config.orderItems.columns.sku.attribute && node.nodeType === Node.ELEMENT_NODE
                ? (node as Element).getAttribute(config.orderItems.columns.sku.attribute)
                : node.textContent?.trim();
              if (rawValue) {
                const value = config.orderItems.columns.sku.transform
                  ? config.orderItems.columns.sku.transform(rawValue)
                  : rawValue;
                item.sku = value.trim();
              }
            }
          }

          // Extract quantity
          if (config.orderItems.columns.quantity) {
            const result = this.doc.evaluate(
              config.orderItems.columns.quantity.selector,
              row,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            const node = result.singleNodeValue;
            if (node) {
              const value = config.orderItems.columns.quantity.attribute && node.nodeType === Node.ELEMENT_NODE
                ? (node as Element).getAttribute(config.orderItems.columns.quantity.attribute)
                : node.textContent?.trim();
              if (value) {
                item.quantity = config.orderItems.columns.quantity.transform
                  ? config.orderItems.columns.quantity.transform(value)
                  : parseFloat(value) || 0;
              }
            }
          }

          // Extract unit price
          if (config.orderItems.columns.unitPrice) {
            const result = this.doc.evaluate(
              config.orderItems.columns.unitPrice.selector,
              row,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            const node = result.singleNodeValue;
            if (node) {
              const value = config.orderItems.columns.unitPrice.attribute && node.nodeType === Node.ELEMENT_NODE
                ? (node as Element).getAttribute(config.orderItems.columns.unitPrice.attribute)
                : node.textContent?.trim();
              if (value) {
                item.unit_price = config.orderItems.columns.unitPrice.transform
                  ? config.orderItems.columns.unitPrice.transform(value)
                  : parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
              }
            }
          }

          // Extract tax
          if (config.orderItems.columns.tax) {
            const result = this.doc.evaluate(
              config.orderItems.columns.tax.selector,
              row,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            const node = result.singleNodeValue;
            if (node) {
              const value = config.orderItems.columns.tax.attribute && node.nodeType === Node.ELEMENT_NODE
                ? (node as Element).getAttribute(config.orderItems.columns.tax.attribute)
                : node.textContent?.trim();
              if (value) {
                item.tax = config.orderItems.columns.tax.transform
                  ? config.orderItems.columns.tax.transform(value)
                  : parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
              }
            }
          }

          // Extract total
          if (config.orderItems.columns.total) {
            const result = this.doc.evaluate(
              config.orderItems.columns.total.selector,
              row,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            const node = result.singleNodeValue;
            if (node) {
              const value = config.orderItems.columns.total.attribute && node.nodeType === Node.ELEMENT_NODE
                ? (node as Element).getAttribute(config.orderItems.columns.total.attribute)
                : node.textContent?.trim();
              if (value) {
                item.total = config.orderItems.columns.total.transform
                  ? config.orderItems.columns.total.transform(value)
                  : parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
              }
            }
          }

          // Calculate total if not provided
          if (!item.total && item.quantity && item.unit_price) {
            item.total = (item.quantity * item.unit_price) + (item.tax || 0);
          }

          // Only add item if it has at least a product name
          if (item.product_name) {
            items.push(item);
          }
        }
      }
    }

    // Extract notes
    if (config.notes) {
      const value = this.extractText(config.notes.selector, config.notes.attribute);
      if (value) {
        order.notes = config.notes.transform
          ? config.notes.transform(value)
          : value;
      }
    }

    return { order, items };
  }

  /**
   * Helper: Get the HTML document for advanced custom parsing
   */
  getDocument(): Document {
    return this.doc;
  }
}

/**
 * Helper function to parse currency values
 */
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
}

/**
 * Helper function to parse dates in various formats
 */
export function parseDate(value: string): string | null {
  const cleaned = value.trim();

  // Try to parse common date formats
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Helper function to extract email addresses from text
 */
export function extractEmail(text: string): string | null {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const match = text.match(emailRegex);
  return match ? match[1] : null;
}

/**
 * Helper function to extract phone numbers from text
 */
export function extractPhone(text: string): string | null {
  const phoneRegex = /(\+?[\d\s\-()]+)/;
  const match = text.match(phoneRegex);
  return match ? match[1].trim() : null;
}

export interface DOMFieldConfig {
  selector: string;
  attribute?: string;
  transform?: string;
}

export interface DOMTableConfig {
  rowSelector: string;
  columns: Record<string, DOMFieldConfig>;
}

export function parseDOMEmail(
  html: string,
  fields: Record<string, DOMFieldConfig>,
  lineItems?: DOMTableConfig
): any {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const result: any = {};

  for (const [key, config] of Object.entries(fields)) {
    try {
      let selector = config.selector.trim();
      if (selector.startsWith('string(') && selector.endsWith(')')) {
        selector = selector.slice(7, -1);
      }

      let value: string | null = null;

      if (config.attribute) {
        try {
          const xpathResult = doc.evaluate(
            selector,
            doc,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          const node = xpathResult.singleNodeValue;
          if (node && node.nodeType === Node.ELEMENT_NODE) {
            value = (node as Element).getAttribute(config.attribute);
          }
        } catch {
          // fall through
        }
      }

      if (!value) {
        value = evaluateXPathAsString(doc, selector);
      }

      if (value) {
        const keys = key.split('.');
        let current = result;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      }
    } catch (err) {
      console.error(`Error extracting field ${key}:`, err);
    }
  }

  if (lineItems) {
    result.lineItems = [];
    try {
      const rowsResult = doc.evaluate(
        lineItems.rowSelector,
        doc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      for (let i = 0; i < rowsResult.snapshotLength; i++) {
        const row = rowsResult.snapshotItem(i);
        if (!row) continue;

        const item: any = {};
        for (const [colKey, colConfig] of Object.entries(lineItems.columns)) {
          try {
            let colSelector = colConfig.selector.trim();
            if (colSelector.startsWith('string(') && colSelector.endsWith(')')) {
              colSelector = colSelector.slice(7, -1);
            }

            let value: string | null = null;

            if (colConfig.attribute) {
              try {
                const colResult = doc.evaluate(
                  colSelector,
                  row,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                );
                const node = colResult.singleNodeValue;
                if (node && node.nodeType === Node.ELEMENT_NODE) {
                  value = (node as Element).getAttribute(colConfig.attribute);
                }
              } catch {
                // fall through
              }
            }

            if (!value) {
              value = evaluateXPathAsString(doc, colSelector, row);
            }

            if (value) {
              item[colKey] = value;
            }
          } catch (err) {
            console.error(`Error extracting column ${colKey}:`, err);
          }
        }
        if (Object.keys(item).length > 0) {
          result.lineItems.push(item);
        }
      }
    } catch (err) {
      console.error('Error extracting line items:', err);
    }
  }

  return result;
}
