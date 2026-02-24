import type { ErpAdapter } from './types';
import { OrderwiseAdapter } from './orderwiseAdapter';

const adapters: Record<string, ErpAdapter> = {
  orderwise: new OrderwiseAdapter(),
};

export function getErpAdapter(erpType: string): ErpAdapter | null {
  return adapters[erpType] ?? null;
}

export function getAvailableErpTypes(): string[] {
  return Object.keys(adapters);
}
