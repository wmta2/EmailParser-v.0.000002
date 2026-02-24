/**
 * Utilities to transform DOM configurations between visual builder and database structures
 */

import { DOMFieldConfig as SimpleDOMFieldConfig, DOMTableConfig } from './domEmailParser';
import { DOMConfig, DOMFieldConfig as TemplateDOMFieldConfig } from './templateEngine';

export interface VisualBuilderConfig {
  fields: Record<string, SimpleDOMFieldConfig>;
  lineItems?: DOMTableConfig;
}

/**
 * Maps visual builder field paths to database field names
 */
const FIELD_PATH_MAPPING: Record<string, string> = {
  // Order fields
  'orderNumber': 'orderNumber',
  'orderDate': 'orderDate',
  'requiredDate': 'requiredDate',
  'customerName': 'customerName',
  'customerEmail': 'customerEmail',
  'customerPhone': 'customerPhone',
  'totalAmount': 'totalAmount',
  'supplierCode': 'supplierCode',
  'accountNumber': 'accountNumber',
  'currency': 'currency',
  'fullAddress': 'fullAddress',
  'notes': 'notes',
  'requester': 'requester',

  // Delivery address - nested path to flat
  'deliveryAddress.name': 'deliveryContact',
  'deliveryAddress.line1': 'deliveryAddress1',
  'deliveryAddress.line2': 'deliveryAddress2',
  'deliveryAddress.line3': 'deliveryAddress3',
  'deliveryAddress.city': 'deliveryTown',
  'deliveryAddress.state': 'deliveryCounty',
  'deliveryAddress.postalCode': 'deliveryPostcode',
  'deliveryAddress.country': 'deliveryCountry',
  'deliveryAddress.email': 'deliveryEmail',
  'deliveryAddress.telephone': 'deliveryTelephone',

  // Billing address - nested path to flat
  'billingAddress.name': 'billingContact',
  'billingAddress.line1': 'billingAddress1',
  'billingAddress.line2': 'billingAddress2',
  'billingAddress.line3': 'billingAddress3',
  'billingAddress.city': 'billingTown',
  'billingAddress.state': 'billingCounty',
  'billingAddress.postalCode': 'billingPostcode',
  'billingAddress.country': 'billingCountry',
};

/**
 * Reverse mapping from database field names to visual builder paths
 */
const REVERSE_FIELD_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_PATH_MAPPING).map(([k, v]) => [v, k])
);

/**
 * Transform visual builder config to database DOMConfig structure
 */
export function visualBuilderToDOMConfig(config: VisualBuilderConfig): DOMConfig {
  const domConfig: DOMConfig = {};

  // Map fields
  Object.entries(config.fields).forEach(([path, fieldConfig]) => {
    const dbFieldName = FIELD_PATH_MAPPING[path];
    if (dbFieldName) {
      domConfig[dbFieldName as keyof DOMConfig] = {
        selector: fieldConfig.selector,
        attribute: fieldConfig.attribute || null,
        transform: fieldConfig.transform || null,
      } as TemplateDOMFieldConfig;
    }
  });

  // Map line items table
  if (config.lineItems) {
    domConfig.orderItems = {
      tableSelector: '', // Will be derived from rowSelector
      rowSelector: config.lineItems.rowSelector,
      columns: Object.fromEntries(
        Object.entries(config.lineItems.columns).map(([key, value]) => [
          key,
          {
            selector: value.selector,
            attribute: value.attribute || null,
          }
        ])
      )
    };
  }

  return domConfig;
}

/**
 * Transform database DOMConfig to visual builder structure
 */
export function domConfigToVisualBuilder(domConfig: DOMConfig | null | undefined): VisualBuilderConfig {
  if (!domConfig) {
    return { fields: {} };
  }

  const visualConfig: VisualBuilderConfig = {
    fields: {}
  };

  // Map fields back
  Object.entries(domConfig).forEach(([dbFieldName, fieldConfig]) => {
    if (dbFieldName === 'orderItems') return; // Handle separately

    const visualPath = REVERSE_FIELD_MAPPING[dbFieldName];
    if (visualPath && fieldConfig) {
      const config = fieldConfig as TemplateDOMFieldConfig;
      // Only add field if it has a selector (not empty)
      if (config.selector) {
        visualConfig.fields[visualPath] = {
          selector: config.selector,
          attribute: config.attribute || undefined,
          transform: config.transform || undefined,
        };
      }
    }
  });

  // Map line items
  if (domConfig.orderItems) {
    visualConfig.lineItems = {
      rowSelector: domConfig.orderItems.rowSelector,
      columns: Object.fromEntries(
        Object.entries(domConfig.orderItems.columns).map(([key, value]) => [
          key,
          {
            selector: value.selector,
            attribute: value.attribute || undefined,
          }
        ])
      )
    };
  }

  return visualConfig;
}

/**
 * Column field definitions for table mapping
 */
export const TABLE_COLUMN_FIELDS = [
  { key: 'product_code', label: 'Product Code/SKU' },
  { key: 'product_name', label: 'Product Name/Description' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit_price', label: 'Unit Price' },
  { key: 'tax', label: 'Tax/VAT' },
  { key: 'total', label: 'Total/Line Total' },
] as const;
