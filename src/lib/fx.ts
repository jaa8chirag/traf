// PLACEHOLDER static rates (units of USD per 1 unit of currency) used ONLY to compare prices across
// currencies in search filters/sorting. Real FX feed + refresh job is a later task; displayed prices
// always use the product's own currency.
const USD_PER_UNIT: Record<string, number> = { USD: 1, INR: 0.012, EUR: 1.08 };

export function toUsd(amount: number, currency: string): number {
  return Math.round(amount * (USD_PER_UNIT[currency] ?? 1) * 100) / 100;
}
