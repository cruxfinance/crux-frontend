import { formatFullNumber, formatNumber, toRawAmount } from "../general";

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

describe("toRawAmount", () => {
  it("converts a simple decimal without float truncation loss", () => {
    // 0.29 * 10 ** 2 as a float is 28.999999999999996, which Math.floor
    // would truncate to 28n instead of 29n.
    expect(toRawAmount("0.29", 2)).toBe(BigInt(29));
  });

  it("converts a whole number string at 0 decimals", () => {
    expect(toRawAmount("1", 0)).toBe(BigInt(1));
  });

  it("truncates excess fraction digits instead of rounding", () => {
    expect(toRawAmount("0.299", 2)).toBe(BigInt(29));
    expect(toRawAmount("0.999", 0)).toBe(BigInt(0));
  });

  it("pads short fraction digits", () => {
    expect(toRawAmount("1.2", 4)).toBe(BigInt(12000));
  });

  it("handles a value with no fractional part", () => {
    expect(toRawAmount("5", 3)).toBe(BigInt(5000));
  });

  it("handles negative amounts", () => {
    expect(toRawAmount("-0.29", 2)).toBe(BigInt(-29));
  });

  it("returns 0n for empty input", () => {
    expect(toRawAmount("", 2)).toBe(BigInt(0));
  });

  it("returns 0n for invalid input", () => {
    expect(toRawAmount("abc", 2)).toBe(BigInt(0));
    expect(toRawAmount("1.2.3", 2)).toBe(BigInt(0));
    expect(toRawAmount(".", 2)).toBe(BigInt(0));
  });
});

describe("formatNumber", () => {
  it("shows the whole budget as decimals for values >= 1", () => {
    expect(formatNumber(1234.5678, 6)).toBe("1,234.57");
    expect(formatNumber(1234.5678, 4)).toBe("1,235");
  });

  it("abbreviates when the integer part exceeds the budget", () => {
    expect(formatNumber(150123.4, 4)).toBe("150.1K");
    expect(formatNumber(1234567, 6)).toBe("1.23457M");
    expect(formatNumber(1234567, 4)).toBe("1.235M");
    expect(formatNumber(2.5e9, 4)).toBe("2.5B");
    expect(formatNumber(3.5e12, 4)).toBe("3.5T");
  });

  it("uses exponent notation from 1e15", () => {
    expect(formatNumber(1.23456e15, 4)).toBe("1.235e15");
    expect(formatNumber(1e15, 4)).toBe("1e15");
  });

  it("re-checks digits after rounding", () => {
    expect(formatNumber(999.996, 5)).toBe("1,000");
    expect(formatNumber(999999.6, 4)).toBe("1M");
    expect(formatNumber(999960, 4)).toBe("1M");
  });

  it("strips trailing zeros by default and keeps them on request", () => {
    expect(formatNumber(1.5, 4)).toBe("1.5");
    expect(formatNumber(2, 4)).toBe("2");
    expect(formatNumber(1.5, 4, { keepTrailingZeros: true })).toBe("1.500");
    expect(formatNumber(2, 4, { keepTrailingZeros: true })).toBe("2.000");
    expect(formatNumber(0.0000012, 6, { keepTrailingZeros: true })).toBe(
      "0.0\u2085" + "1200",
    );
  });

  it("formats values below 1 plainly up to three leading zeros", () => {
    expect(formatNumber(0.5, 4)).toBe("0.5");
    expect(formatNumber(0.123456, 4)).toBe("0.123");
    expect(formatNumber(0.00012345, 4)).toBe("0.00012");
    expect(formatNumber(0.00012345, 6)).toBe("0.00012");
  });

  it("uses subscript-zero notation from four leading zeros", () => {
    expect(formatNumber(0.0000012345, 6)).toBe("0.0\u2085" + "1235");
    expect(formatNumber(0.0000012345, 4)).toBe("0.0\u2085" + "12");
    expect(formatNumber(1.5e-12, 4)).toBe("0.0\u2081\u2081" + "15");
  });

  it("falls back to plain output when subscript rounding reaches 0.0001", () => {
    expect(formatNumber(0.000099999, 4)).toBe("0.0001");
  });

  it("promotes values <1 that round up to 1", () => {
    expect(formatNumber(0.99996, 3)).toBe("1");
  });

  it("handles sign, noNeg, zero and non-finite input", () => {
    expect(formatNumber(-1234.5678, 6)).toBe("-1,234.57");
    expect(formatNumber(-1234.5678, 6, { noNeg: true })).toBe("1,234.57");
    expect(formatNumber(-0.5, 4)).toBe("-0.5");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(NaN)).toBe("NaN");
    expect(formatNumber(Infinity)).toBe("Infinity");
    expect(formatNumber(-Infinity)).toBe("-Infinity");
  });
});
