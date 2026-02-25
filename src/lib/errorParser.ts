export interface FailedVariant {
  code: string;
  reason?: string;
  type: 'missing' | 'not_found';
}

export interface FailedVariantCounts {
  missingCount: number;
  notFoundCount: number;
  variants: FailedVariant[];
}

export function parseFailedVariantCodes(errorResponse: Record<string, unknown> | null): FailedVariant[] {
  const result = parseFailedVariantCodesWithCounts(errorResponse);
  return result.variants;
}

export function parseFailedVariantCodesWithCounts(errorResponse: Record<string, unknown> | null): FailedVariantCounts {
  if (!errorResponse) return { missingCount: 0, notFoundCount: 0, variants: [] };

  const failedVariants: FailedVariant[] = [];
  const errorMessage = extractErrorMessage(errorResponse);

  if (!errorMessage) return { missingCount: 0, notFoundCount: 0, variants: [] };

  // Pattern 1: Detect codes that were rejected by the ERP (not found/inactive)
  const notFoundPattern = /variant code:\s*([A-Z0-9-]+)\s+does not exist or is not active/gi;
  let match;
  while ((match = notFoundPattern.exec(errorMessage)) !== null) {
    const code = match[1].toUpperCase();
    if (!failedVariants.some(v => v.code === code)) {
      failedVariants.push({
        code,
        reason: 'Not found in ERP or inactive',
        type: 'not_found'
      });
    }
  }

  // Pattern 2: Detect missing/empty variant codes
  const missingPattern = /no variant has been provided/gi;
  const missingMatches = errorMessage.match(missingPattern);
  const missingCount = missingMatches ? missingMatches.length : 0;

  // For missing variants, we mark them with a special identifier
  // since we don't have the actual code
  if (missingCount > 0) {
    // Extract order numbers to contextualize missing variants
    const orderNumberPattern = /Order number (\d+)/gi;
    let orderMatch;
    const orderNumbers: string[] = [];
    while ((orderMatch = orderNumberPattern.exec(errorMessage)) !== null) {
      if (!orderNumbers.includes(orderMatch[1])) {
        orderNumbers.push(orderMatch[1]);
      }
    }
  }

  const notFoundCount = failedVariants.filter(v => v.type === 'not_found').length;

  return {
    missingCount,
    notFoundCount,
    variants: failedVariants
  };
}

function extractErrorMessage(obj: Record<string, unknown>): string {
  const parts: string[] = [];

  function traverse(value: unknown): void {
    if (typeof value === 'string') {
      parts.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(traverse);
    } else if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(traverse);
    }
  }

  traverse(obj);
  return parts.join(' ');
}

export function isItemFailed(itemSku: string | undefined, failedVariants: FailedVariant[]): boolean {
  if (!itemSku || failedVariants.length === 0) return false;
  const normalizedSku = itemSku.toUpperCase();
  return failedVariants.some(v => v.code === normalizedSku || normalizedSku.includes(v.code) || v.code.includes(normalizedSku));
}
