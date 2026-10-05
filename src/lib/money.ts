const SYMBOL: Record<string, string> = { USD: "US$", INR: "₹", EUR: "€" };

export const currencySymbol = (currency: string): string => SYMBOL[currency] ?? `${currency} `;

const trim = (n: string): string => {
  const [i, f = ""] = n.split(".");
  const frac = f.replace(/0+$/, "");
  return `${Number(i).toLocaleString("en-US")}${frac ? `.${frac.padEnd(2, "0")}` : ""}`;
};

/** "US$ 4.20 - 5.60", "US$ 3", or null when no price is set. Inputs are decimal strings. */
export function formatPriceRange(currency: string, min: string | null, max: string | null): string | null {
  if (min === null) return null;
  const sym = currencySymbol(currency);
  return max === null || Number(max) === Number(min) ? `${sym} ${trim(min)}` : `${sym} ${trim(min)} - ${trim(max)}`;
}

export const formatMoq = (moq: number, unit: string): string => `${moq.toLocaleString("en-US")} ${unit}`;
