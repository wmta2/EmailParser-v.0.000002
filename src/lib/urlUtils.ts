export function cleanOrderwiseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/(OWAPI|OWAPISB)$/i, '');
}
