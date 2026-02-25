const PLACEHOLDER_PATTERNS = [
  /^add\s+code/i,
  /^enter\s+(sku|code|product)/i,
  /^pending$/i,
  /^tbc$/i,
  /^to\s+be\s+confirmed/i,
  /^n\/?a$/i,
  /^not\s+applicable/i,
  /^missing$/i,
  /^unknown$/i,
  /^\s*!+\s*$/,
];

export function sanitizeText(value: string | null | undefined): string {
  if (!value) return '';

  let sanitized = value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\t+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return sanitized;
}

export function isPlaceholderText(value: string | null | undefined): boolean {
  if (!value) return true;

  const cleaned = sanitizeText(value);
  if (!cleaned) return true;

  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(cleaned));
}

export function isValidProductCode(value: string | null | undefined): boolean {
  if (!value) return false;

  const sanitized = sanitizeText(value);
  if (!sanitized) return false;
  if (isPlaceholderText(sanitized)) return false;

  if (sanitized.length < 1) return false;
  if (sanitized.length > 200) return false;

  const hasExcessiveWhitespace = /\s{2,}/.test(value);
  if (hasExcessiveWhitespace) return false;

  const hasNewlines = /[\r\n]/.test(value);
  if (hasNewlines) return false;

  return true;
}

export function sanitizeProductCode(value: string | null | undefined): string | null {
  if (!value) return null;

  const sanitized = sanitizeText(value);
  if (!sanitized) return null;
  if (isPlaceholderText(sanitized)) return null;
  if (!isValidProductCode(value)) return null;

  return sanitized;
}

export function sanitizeOrderItem(item: any): any {
  return {
    ...item,
    product_code: item.product_code ? sanitizeProductCode(item.product_code) : null,
    sku: item.sku ? sanitizeProductCode(item.sku) : null,
    product_name: item.product_name ? sanitizeText(item.product_name) : '',
    size: item.size ? sanitizeText(item.size) : null,
    uom: item.uom ? sanitizeText(item.uom) : null,
  };
}

export function isValidOrderItem(item: any): boolean {
  if (!item.product_name || !sanitizeText(item.product_name)) {
    return false;
  }

  const hasValidCode = isValidProductCode(item.product_code) || isValidProductCode(item.sku);

  if (!hasValidCode) {
    console.warn('Order item has no valid product code or SKU:', {
      product_name: item.product_name,
      product_code: item.product_code,
      sku: item.sku
    });
  }

  return true;
}
