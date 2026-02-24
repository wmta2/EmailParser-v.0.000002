import type { RawEmail, Order, OrderItem } from './supabase';
import { dynamicDetectTemplate, dynamicParseEmail } from './templateEngine';

export interface ParsedOrderData {
  order: Omit<Order, 'id' | 'created_at' | 'raw_email_id' | 'channel_source' | 'channel_id' | 'customer_id' | 'external_order_id' | 'order_status' | 'currency' | 'order_total' | 'shipping_total' | 'tax_total' | 'discount_total'>;
  items: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[];
}

export interface DetectionResult {
  templateType: string;
  confidence: number;
}

export async function detectTemplate(email: RawEmail): Promise<DetectionResult> {
  return dynamicDetectTemplate(email);
}

export async function parseEmail(email: RawEmail): Promise<ParsedOrderData | null> {
  const detection = await detectTemplate(email);

  if (detection.templateType === 'unknown') {
    return null;
  }

  return dynamicParseEmail(email, detection.templateType);
}
