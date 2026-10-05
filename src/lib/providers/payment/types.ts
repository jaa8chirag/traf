export interface Money {
  /** Decimal string, never a JS float. */
  amount: string;
  currency: string;
}

export interface CheckoutInput {
  orderId: string;
  amount: Money;
  buyer: { userId: string; email: string };
  returnUrl: string;
  idempotencyKey: string;
}

export interface PaymentEvent {
  type: "payment.captured" | "payment.failed" | "refund.processed";
  providerRef: string;
  amount: Money;
}

export interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<{ providerRef: string; clientSecret?: string; redirectUrl?: string }>;
  verifyWebhook(req: { rawBody: string; headers: Headers }): Promise<PaymentEvent>;
  refund(input: { providerRef: string; amount: Money; idempotencyKey: string }): Promise<{ refundRef: string }>;
}
