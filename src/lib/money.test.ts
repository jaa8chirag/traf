import { describe, expect, it } from "vitest";
import { formatMoq, formatPriceRange } from "./money";

describe("formatPriceRange", () => {
  it("formats ranges, singles and missing prices", () => {
    expect(formatPriceRange("USD", "4.2", "5.60")).toBe("US$ 4.20 - 5.60");
    expect(formatPriceRange("USD", "3.00", "3")).toBe("US$ 3");
    expect(formatPriceRange("INR", "1500", null)).toBe("₹ 1,500");
    expect(formatPriceRange("USD", null, null)).toBeNull();
  });
  it("formats MOQ", () => {
    expect(formatMoq(1500, "pieces")).toBe("1,500 pieces");
  });
});
