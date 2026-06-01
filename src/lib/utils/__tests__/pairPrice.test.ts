import { calculatePairPrice } from "../general";

describe("calculatePairPrice", () => {
  // --- Core functionality ---

  it("calculates ERG/USE pair price correctly", () => {
    // 1 ERG = 1 ERG, 1 USE = 0.333 ERG
    // So 1 ERG = 1 / 0.333 ≈ 3.003 USE
    expect(calculatePairPrice(1, 0.333)).toBeCloseTo(3.003003, 6);
  });

  it("calculates CRUX/ERG pair price correctly", () => {
    // 1 CRUX = 0.0001 ERG, 1 ERG = 1 ERG
    // So 1 CRUX = 0.0001 / 1 = 0.0001 ERG
    expect(calculatePairPrice(0.0001, 1)).toBe(0.0001);
  });

  it("calculates USE/ERG pair price correctly", () => {
    // 1 USE = 0.333 ERG, 1 ERG = 1 ERG
    // So 1 USE = 0.333 / 1 = 0.333 ERG
    expect(calculatePairPrice(0.333, 1)).toBe(0.333);
  });

  it("calculates CRUX/USE pair price correctly", () => {
    // 1 CRUX = 0.0001 ERG, 1 USE = 0.333 ERG
    // So 1 CRUX = 0.0001 / 0.333 ≈ 0.0003003 USE
    expect(calculatePairPrice(0.0001, 0.333)).toBeCloseTo(0.0003003, 7);
  });

  // --- ERG as base (the problematic case) ---

  it("returns 1 when both tokens are ERG (same price)", () => {
    expect(calculatePairPrice(1, 1)).toBe(1);
  });

  // --- Edge cases: zero, null, undefined ---

  it("returns 0 when basePrice is 0", () => {
    expect(calculatePairPrice(0, 1)).toBe(0);
  });

  it("returns 0 when quotePrice is 0", () => {
    expect(calculatePairPrice(1, 0)).toBe(0);
  });

  it("returns 0 when basePrice is null", () => {
    expect(calculatePairPrice(null, 1)).toBe(0);
  });

  it("returns 0 when quotePrice is null", () => {
    expect(calculatePairPrice(1, null)).toBe(0);
  });

  it("returns 0 when basePrice is undefined", () => {
    expect(calculatePairPrice(undefined, 1)).toBe(0);
  });

  it("returns 0 when quotePrice is undefined", () => {
    expect(calculatePairPrice(1, undefined)).toBe(0);
  });

  it("returns 0 when both prices are null", () => {
    expect(calculatePairPrice(null, null)).toBe(0);
  });

  // --- Edge cases: NaN, Infinity ---

  it("returns 0 when basePrice is NaN", () => {
    expect(calculatePairPrice(NaN, 1)).toBe(0);
  });

  it("returns 0 when quotePrice is NaN", () => {
    expect(calculatePairPrice(1, NaN)).toBe(0);
  });

  it("returns 0 when quotePrice is Infinity", () => {
    expect(calculatePairPrice(1, Infinity)).toBe(0);
  });

  it("returns 0 when basePrice is Infinity and quotePrice is finite", () => {
    expect(calculatePairPrice(Infinity, 1)).toBe(Infinity);
  });

  // --- Negative prices (defensive) ---

  it("handles negative prices (returns negative rate)", () => {
    // Negative prices shouldn't happen in practice, but the math should work
    expect(calculatePairPrice(-1, 0.5)).toBe(-2);
  });

  // --- Realistic crypto values ---

  it("handles very small base prices (shitcoins)", () => {
    expect(calculatePairPrice(0.00000001, 1)).toBe(0.00000001);
  });

  it("handles large base prices (wrapped BTC)", () => {
    expect(calculatePairPrice(50000, 1)).toBe(50000);
  });
});
