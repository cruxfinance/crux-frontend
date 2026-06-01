import { formatFullNumber } from "../general";

describe("formatFullNumber", () => {
  // Core formatting: full numbers with commas, no abbreviations
  it("formats whole numbers under 1000 with 2 decimal places", () => {
    expect(formatFullNumber(42)).toBe("42.00");
  });

  it("formats numbers >= 1000 with comma separators and no K suffix", () => {
    expect(formatFullNumber(625201.67)).toBe("625,201.67");
  });

  it("formats numbers >= 1,000,000 with commas and no M suffix", () => {
    expect(formatFullNumber(1234567.89)).toBe("1,234,567.89");
  });

  it("formats billions with commas and no B suffix", () => {
    expect(formatFullNumber(5000000000)).toBe("5,000,000,000.00");
  });

  it("formats trillions with commas and no T suffix", () => {
    expect(formatFullNumber(1500000000000)).toBe("1,500,000,000,000.00");
  });

  it("formats zero cleanly", () => {
    expect(formatFullNumber(0)).toBe("0.00");
  });

  // Negative numbers
  it("formats negative numbers with minus sign and commas", () => {
    expect(formatFullNumber(-1234.56)).toBe("-1,234.56");
  });

  it("formats negative small decimals", () => {
    expect(formatFullNumber(-0.42)).toBe("-0.42");
  });

  // Decimal place control
  it("rounds to 0 decimal places when specified", () => {
    expect(formatFullNumber(100.5, 0)).toBe("101");
  });

  it("rounds to 2 decimal places (default)", () => {
    expect(formatFullNumber(0.857142)).toBe("0.86");
  });

  it("rounds to 3 decimal places when specified", () => {
    expect(formatFullNumber(0.857142, 3)).toBe("0.857");
  });

  it("rounds to 6 decimal places for small values", () => {
    expect(formatFullNumber(0.123456789, 6)).toBe("0.123457");
  });

  // 9-decimal cap enforcement
  it("caps decimals at 9 when 10 is requested", () => {
    expect(formatFullNumber(1.123456789012, 10)).toBe("1.123456789");
  });

  it("allows exactly 9 decimals", () => {
    expect(formatFullNumber(1.123456789, 9)).toBe("1.123456789");
  });

  it("does not clamp when default (2) decimals are used", () => {
    expect(formatFullNumber(1234.567890123)).toBe("1,234.57");
  });

  // Edge cases
  it("handles very small numbers", () => {
    expect(formatFullNumber(0.000000001)).toBe("0.00");
  });

  it("handles very small numbers with high decimals", () => {
    expect(formatFullNumber(0.000000001, 9)).toBe("0.000000001");
  });

  it("handles NaN gracefully via Intl (will produce 'NaN')", () => {
    const result = formatFullNumber(NaN);
    // Intl.NumberFormat returns "NaN" string for NaN input
    expect(result).toBe("NaN");
  });

  it("handles Infinity gracefully via Intl (will produce '∞')", () => {
    const result = formatFullNumber(Infinity);
    expect(result).toBe("∞");
  });
});
