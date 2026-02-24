export interface FailedVariant {
  code: string;
  reason?: string;
}

export function parseFailedVariantCodes(errorResponse: Record<string, unknown> | null): FailedVariant[] {
  if (!errorResponse) return [];

  const failedVariants: FailedVariant[] = [];
  const errorMessage = extractErrorMessage(errorResponse);

  if (!errorMessage) return [];

  const variantPatterns = [
    /variant\s*(?:code)?[:\s]*["']?([A-Z0-9-]+)["']?/gi,
    /product\s*(?:code)?[:\s]*["']?([A-Z0-9-]+)["']?/gi,
    /sku[:\s]*["']?([A-Z0-9-]+)["']?/gi,
    /["']([A-Z0-9]+-[A-Z0-9]+(?:-[A-Z0-9]+)*)["']/g,
    /\b(\d{6,}-[A-Z0-9]+(?:-[A-Z0-9]+)*)\b/g,
  ];

  for (const pattern of variantPatterns) {
    let match;
    while ((match = pattern.exec(errorMessage)) !== null) {
      const code = match[1].toUpperCase();
      if (!failedVariants.some(v => v.code === code)) {
        failedVariants.push({ code });
      }
    }
  }

  return failedVariants;
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
