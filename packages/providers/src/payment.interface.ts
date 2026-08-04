import type { BaseProvider } from './base.interface.js';

export interface PaymentProvider extends BaseProvider {
  readonly type: 'PAYMENT';
  createCheckoutSession(
    amount: number,
    currency: string,
    customerEmail: string
  ): Promise<{ sessionId: string; checkoutUrl: string }>;
}
