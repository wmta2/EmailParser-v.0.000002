import { supabase } from './supabase';
import type { RawEmail, OrderItem } from './supabase';
import type { ParsedOrderData, DetectionResult } from './emailParser';
import { parseWithDOM, shouldUseDOMTemplate } from './templates/domTestTemplate';
import { evaluateXPathAsString } from './domUtils';

function toISODateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  const MONTH_MAP: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  let day = '', month = '', year = '';

  const slashDash = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashDash) {
    day = slashDash[1].padStart(2, '0');
    month = slashDash[2].padStart(2, '0');
    year = slashDash[3].length === 2 ? '20' + slashDash[3] : slashDash[3];
  }

  if (!day) {
    const compact = v.match(/^(\d{2})(\d{2})(\d{2,4})$/);
    if (compact) {
      day = compact[1];
      month = compact[2];
      year = compact[3].length === 2 ? '20' + compact[3] : compact[3];
    }
  }

  if (!day) {
    const named = v.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/);
    if (named) {
      const mKey = named[2].toLowerCase().slice(0, 3);
      if (MONTH_MAP[mKey]) {
        day = named[1].padStart(2, '0');
        month = MONTH_MAP[mKey];
        year = named[3].length === 2 ? '20' + named[3] : named[3];
      }
    }
  }

  if (!day) {
    const namedRev = v.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})$/);
    if (namedRev) {
      const mKey = namedRev[1].toLowerCase().slice(0, 3);
      if (MONTH_MAP[mKey]) {
        day = namedRev[2].padStart(2, '0');
        month = MONTH_MAP[mKey];
        year = namedRev[3].length === 2 ? '20' + namedRev[3] : namedRev[3];
      }
    }
  }

  if (day && month && year) {
    const iso = `${year}-${month}-${day}T00:00:00.000Z`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return iso;
  }

  const fallback = new Date(v);
  if (!isNaN(fallback.getTime())) return fallback.toISOString();

  return null;
}

export interface DOMFieldConfig {
  selector: string;
  attribute?: string | null;
  transform?: string | null;
  blockSelector?: string;
  blockParser?: boolean;
}

export interface DOMTableConfig {
  tableSelector: string;
  rowSelector: string;
  columns: Record<string, { selector: string; attribute?: string | null }>;
}

export interface DOMConfig {
  orderNumber?: DOMFieldConfig;
  requiredDate?: DOMFieldConfig;
  notes?: DOMFieldConfig;
  requester?: DOMFieldConfig;
  supplierCode?: DOMFieldConfig;
  accountNumber?: DOMFieldConfig;
  currency?: DOMFieldConfig;
  fullAddress?: DOMFieldConfig;
  deliveryContact?: DOMFieldConfig;
  deliveryEmail?: DOMFieldConfig;
  deliveryTelephone?: DOMFieldConfig;
  deliveryAddress1?: DOMFieldConfig;
  deliveryAddress2?: DOMFieldConfig;
  deliveryAddress3?: DOMFieldConfig;
  deliveryTown?: DOMFieldConfig;
  deliveryCounty?: DOMFieldConfig;
  deliveryPostcode?: DOMFieldConfig;
  deliveryCountry?: DOMFieldConfig;
  billingContact?: DOMFieldConfig;
  billingAddress1?: DOMFieldConfig;
  billingAddress2?: DOMFieldConfig;
  billingAddress3?: DOMFieldConfig;
  billingTown?: DOMFieldConfig;
  billingCounty?: DOMFieldConfig;
  billingPostcode?: DOMFieldConfig;
  billingCountry?: DOMFieldConfig;
  orderItems?: DOMTableConfig;
}

export interface EmailTemplatePattern {
  id: string;
  template_name: string;
  template_type: string;
  provider_name: string;
  platform?: string | null;
  detection_keywords: string[];
  confidence_threshold: number;
  dom_config: DOMConfig;
  table_header_keywords: string[];
  column_mapping: Record<string, string>;
  priority: number;
  active: boolean;
}

let cachedTemplates: EmailTemplatePattern[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function loadActiveTemplates(forceRefresh = false, platform?: string | null): Promise<EmailTemplatePattern[]> {
  const now = Date.now();

  if (!forceRefresh && cachedTemplates && (now - cacheTime) < CACHE_DURATION && !platform) {
    return cachedTemplates;
  }

  let query = supabase
    .from('email_template_patterns')
    .select('*')
    .eq('active', true);

  if (platform) {
    query = query.or(`platform.eq.${platform},platform.is.null`);
  }

  const { data, error } = await query.order('priority', { ascending: false });

  if (error) {
    console.error('Error loading templates:', error);
    return cachedTemplates || [];
  }

  const templates = data as EmailTemplatePattern[];

  if (!platform) {
    cachedTemplates = templates;
    cacheTime = now;
  }

  if (platform) {
    const platformSpecific = templates.filter(t => t.platform === platform);
    const universal = templates.filter(t => !t.platform);
    return [...platformSpecific, ...universal];
  }

  return templates;
}

export function clearTemplateCache(): void {
  cachedTemplates = null;
  cacheTime = 0;
}


export async function dynamicDetectTemplate(email: RawEmail, platform?: string | null): Promise<DetectionResult> {
  const templates = await loadActiveTemplates(false, platform);
  const content = email.html_body || email.content || '';
  const lowerContent = content.toLowerCase();

  let bestMatch: DetectionResult = { templateType: 'unknown', confidence: 0 };

  for (const template of templates) {
    let matchedKeywords = 0;

    template.detection_keywords.forEach(keyword => {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matchedKeywords += 1;
      }
    });

    const confidence = (matchedKeywords / template.detection_keywords.length) * 100;

    if (confidence >= template.confidence_threshold && confidence > bestMatch.confidence) {
      bestMatch = {
        templateType: template.template_type,
        confidence
      };
    }
  }

  return bestMatch;
}

/**
 * Extract value from DOM using field configuration with XPath
 */
function extractDOMFieldValue(doc: Document, config: DOMFieldConfig | undefined): string {
  if (!config || !config.selector) return '';

  try {
    let selector = config.selector.trim();
    if (selector.startsWith('string(') && selector.endsWith(')')) {
      selector = selector.slice(7, -1);
    }

    let value = '';

    const stringResult = evaluateXPathAsString(doc, selector);
    if (stringResult !== null) {
      if (config.attribute) {
        try {
          const nodeResult = doc.evaluate(selector, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const node = nodeResult.singleNodeValue;
          if (node && node.nodeType === Node.ELEMENT_NODE) {
            value = (node as Element).getAttribute(config.attribute) || '';
          } else {
            value = stringResult;
          }
        } catch {
          value = stringResult;
        }
      } else {
        value = stringResult;
      }
    }

    value = value.trim();

    if (config.transform && value) {
      switch (config.transform) {
        case 'trim':
          value = value.trim();
          break;
        case 'extractNumber': {
          const match = value.match(/\d+/);
          value = match ? match[0] : value;
          break;
        }
        case 'extractDate': {
          const dateMatch = value.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/);
          value = dateMatch ? dateMatch[0] : value;
          break;
        }
        case 'upperCase':
          value = value.toUpperCase();
          break;
        case 'lowerCase':
          value = value.toLowerCase();
          break;
      }
    }

    return value;
  } catch (error) {
    console.error(`Error extracting DOM field with XPath "${config.selector}":`, error);
    return '';
  }
}

/**
 * Parse email using DOM-based approach with dom_config
 */
async function parseEmailWithDOM(email: RawEmail, template: EmailTemplatePattern): Promise<ParsedOrderData | null> {
  try {
    const htmlContent = email.html_body || '';
    if (!htmlContent) {
      console.warn('No HTML content available for DOM parsing');
      return null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const config = template.dom_config;

    // Extract order fields
    const orderNumber = extractDOMFieldValue(doc, config.orderNumber);
    const requiredDate = extractDOMFieldValue(doc, config.requiredDate);
    const notes = extractDOMFieldValue(doc, config.notes);
    const requester = extractDOMFieldValue(doc, config.requester) || email.from_email || '';
    const supplierCode = extractDOMFieldValue(doc, config.supplierCode);
    const accountNumber = extractDOMFieldValue(doc, config.accountNumber);
    const currency = extractDOMFieldValue(doc, config.currency);
    const fullAddress = extractDOMFieldValue(doc, config.fullAddress);

    // Extract delivery address fields
    const deliveryContact = extractDOMFieldValue(doc, config.deliveryContact);
    const deliveryEmail = extractDOMFieldValue(doc, config.deliveryEmail);
    const deliveryTelephone = extractDOMFieldValue(doc, config.deliveryTelephone);
    const deliveryAddress1 = extractDOMFieldValue(doc, config.deliveryAddress1);
    const deliveryAddress2 = extractDOMFieldValue(doc, config.deliveryAddress2);
    const deliveryAddress3 = extractDOMFieldValue(doc, config.deliveryAddress3);
    const deliveryTown = extractDOMFieldValue(doc, config.deliveryTown);
    const deliveryCounty = extractDOMFieldValue(doc, config.deliveryCounty);
    const deliveryPostcode = extractDOMFieldValue(doc, config.deliveryPostcode);
    const deliveryCountry = extractDOMFieldValue(doc, config.deliveryCountry);

    // Extract billing address fields
    const billingContact = extractDOMFieldValue(doc, config.billingContact);
    const billingAddress1 = extractDOMFieldValue(doc, config.billingAddress1);
    const billingAddress2 = extractDOMFieldValue(doc, config.billingAddress2);
    const billingAddress3 = extractDOMFieldValue(doc, config.billingAddress3);
    const billingTown = extractDOMFieldValue(doc, config.billingTown);
    const billingCounty = extractDOMFieldValue(doc, config.billingCounty);
    const billingPostcode = extractDOMFieldValue(doc, config.billingPostcode);
    const billingCountry = extractDOMFieldValue(doc, config.billingCountry);

    // Extract order items using DOM config with XPath
    let items: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[] = [];
    if (config.orderItems && config.orderItems.rowSelector) {
      const rowResult = doc.evaluate(
        config.orderItems.rowSelector,
        doc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      for (let i = 0; i < rowResult.snapshotLength; i++) {
        const row = rowResult.snapshotItem(i);
        if (!row) continue;

        const item: any = {
          product_code: '',
          product_name: '',
          quantity: 0,
          unit_price: 0,
          total: 0,
          size: '',
          tax: 0,
          gross: 0,
          uom: '',
          position: i
        };

        Object.entries(config.orderItems!.columns).forEach(([columnKey, columnConfig]) => {
          try {
            let value = '';

            const strVal = evaluateXPathAsString(doc, columnConfig.selector, row);
            if (strVal !== null) {
              if (columnConfig.attribute) {
                try {
                  const colResult = doc.evaluate(
                    columnConfig.selector,
                    row,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                  );
                  const element = colResult.singleNodeValue;
                  if (element && element.nodeType === Node.ELEMENT_NODE) {
                    value = (element as Element).getAttribute(columnConfig.attribute) || '';
                  } else {
                    value = strVal;
                  }
                } catch {
                  value = strVal;
                }
              } else {
                value = strVal;
              }
            }

            if (!value) return;

            // Map column key to item property
            switch (columnKey) {
              case 'product_code':
                item.product_code = value;
                break;
              case 'product_name':
                item.product_name = value;
                break;
              case 'quantity':
                item.quantity = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
                break;
              case 'unit_price':
                item.unit_price = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
                break;
              case 'tax':
                item.tax = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
                break;
              case 'total':
                item.total = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
                break;
            }
          } catch (error) {
            console.error(`Error extracting column ${columnKey}:`, error);
          }
        });

        // Calculate total if not provided
        if (!item.total && item.quantity && item.unit_price) {
          item.total = item.quantity * item.unit_price + (item.tax || 0);
        }

        // Only add if has a product name or code
        if (item.product_name || item.product_code) {
          items.push(item);
        }
      }
    }

    return {
      order: {
        order_number: orderNumber,
        notes,
        requester,
        supplier_code: supplierCode,
        account_number: accountNumber || null,
        currency: currency || 'GBP',
        full_address: fullAddress || null,
        template_type: template.template_type,
        parsing_status: 'pending',
        parsing_error: null,
        parsed_at: new Date().toISOString(),
        required_date: toISODateTime(requiredDate),
        delivery_name: deliveryContact || null,
        delivery_address1: deliveryAddress1 || null,
        delivery_address2: deliveryAddress2 || null,
        delivery_address3: deliveryAddress3 || null,
        delivery_town: deliveryTown || null,
        delivery_county: deliveryCounty || null,
        delivery_postcode: deliveryPostcode || null,
        delivery_country: deliveryCountry || null,
        delivery_email: deliveryEmail || null,
        delivery_telephone: deliveryTelephone || null,
        billing_name: billingContact || null,
        billing_address1: billingAddress1 || null,
        billing_address2: billingAddress2 || null,
        billing_address3: billingAddress3 || null,
        billing_town: billingTown || null,
        billing_county: billingCounty || null,
        billing_postcode: billingPostcode || null,
        billing_country: billingCountry || null
      },
      items
    };
  } catch (error) {
    console.error('Error in DOM parsing:', error);
    return null;
  }
}

export async function dynamicParseEmail(email: RawEmail, templateType: string): Promise<ParsedOrderData | null> {
  const templates = await loadActiveTemplates();
  const template = templates.find(t => t.template_type === templateType);

  if (!template) {
    console.error('Template not found:', templateType);
    return null;
  }

  return await parseEmailWithDOM(email, template);
}
