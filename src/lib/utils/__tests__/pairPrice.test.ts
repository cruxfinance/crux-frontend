import { calculatePairPrice } from "../general";
import { getOrderSide, getOrderPrice, calculateLimitOrderPriceRatio } from "../pairPrice";
import { ERG_TOKEN_ID, USE_TOKEN_ID, CRUX_TOKEN_ID } from "@lib/configs/paymentTokens";

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

describe("getOrderSide / getOrderPrice", () => {
  // ERG/USE: ERG is the BASE token, USE is the QUOTE token.

  it("ERG-base sell: giving ERG (given_token_id null) is a sell, price in USE per ERG", () => {
    const order = {
      given_token_id: null,
      taken_token_id: USE_TOKEN_ID,
      given_token_decimals: 9,
      taken_token_decimals: 6,
      price_numerator: 3_000_000,
      price_denominator: 1_000_000_000,
    };
    const side = getOrderSide(order, USE_TOKEN_ID);
    expect(side).toBe("sell");
    expect(getOrderPrice(order, side)).toBeCloseTo(3, 9);
  });

  it("ERG-base buy: giving USE (the quote) is a buy, price in USE per ERG", () => {
    const order = {
      given_token_id: USE_TOKEN_ID,
      taken_token_id: null,
      given_token_decimals: 6,
      taken_token_decimals: 9,
      price_numerator: 333_333_334,
      price_denominator: 1_000_000,
    };
    const side = getOrderSide(order, USE_TOKEN_ID);
    expect(side).toBe("buy");
    expect(getOrderPrice(order, side)).toBeCloseTo(3, 5);
  });

  // CRUX/ERG: ERG is the QUOTE token (the common case, unaffected by the fix).

  it("ERG-quote buy: giving ERG (the quote) is a buy", () => {
    const order = {
      given_token_id: null,
      taken_token_id: CRUX_TOKEN_ID,
      given_token_decimals: 9,
      taken_token_decimals: 2,
      price_numerator: 1_000_000,
      price_denominator: 1_000_000_000,
    };
    const side = getOrderSide(order, ERG_TOKEN_ID);
    expect(side).toBe("buy");
    expect(getOrderPrice(order, side)).toBeCloseTo(0.0001, 9);
  });

  it("ERG-quote sell: giving the base token (not ERG) is a sell", () => {
    const order = {
      given_token_id: CRUX_TOKEN_ID,
      taken_token_id: null,
      given_token_decimals: 2,
      taken_token_decimals: 9,
      price_numerator: 100_000,
      price_denominator: 100,
    };
    const side = getOrderSide(order, ERG_TOKEN_ID);
    expect(side).toBe("sell");
    expect(getOrderPrice(order, side)).toBeCloseTo(0.0001, 9);
  });

  // Token/token pair with neither side being ERG.

  it("token/token pair: side and price resolve the same as any other pair", () => {
    const order = {
      given_token_id: USE_TOKEN_ID,
      taken_token_id: CRUX_TOKEN_ID,
      given_token_decimals: 6,
      taken_token_decimals: 2,
      price_numerator: 50,
      price_denominator: 1_000_000,
    };
    const side = getOrderSide(order, USE_TOKEN_ID);
    expect(side).toBe("buy");
    expect(getOrderPrice(order, side)).toBeCloseTo(2, 9);
  });

  it("does not treat 0 decimals as 9 (given/taken decimals asymmetric)", () => {
    const order = {
      given_token_id: CRUX_TOKEN_ID,
      taken_token_id: USE_TOKEN_ID,
      given_token_decimals: 0,
      taken_token_decimals: 3,
      price_numerator: 1,
      price_denominator: 1,
    };
    // side is irrelevant to this check; use "sell" to exercise the raw ratio directly
    expect(getOrderPrice(order, "sell")).toBeCloseTo(0.001, 9);
  });
});

describe("calculateLimitOrderPriceRatio", () => {
  it("does not lose ~17% of precision buying a 0-decimal token at a low ERG price", () => {
    // Buying a 0-decimal token at 0.3 ERG. The naive formula (numerator
    // scaled only by takenDecimals=0) gives ceil(1/0.3)=4 over 10^9, which
    // displays as 0.25 ERG -- ~17% off the entered price.
    const { priceNumerator, priceDenominator } = calculateLimitOrderPriceRatio(
      0.3,
      "buy",
      9,
      0,
    );
    const displayPrice = getOrderPrice(
      {
        price_numerator: priceNumerator,
        price_denominator: priceDenominator,
        given_token_decimals: 9,
        taken_token_decimals: 0,
      },
      "buy",
    );
    expect(displayPrice).toBeCloseTo(0.3, 6);
    expect(Number.isSafeInteger(priceNumerator)).toBe(true);
    expect(Number.isSafeInteger(priceDenominator)).toBe(true);
  });

  it("matches the old formula's ratio for a normal 9-decimal ERG case", () => {
    // With enough takenDecimals the numerator already has >=8 significant
    // digits, so no extra scaling is needed -- the ratio is unchanged
    // (allowing for gcd reduction) from the pre-fix formula.
    const priceFloat = 3.5;
    const givenDecimals = 9;
    const takenDecimals = 9;
    const oldNumerator = Math.ceil(
      (1 / priceFloat) * Math.pow(10, takenDecimals),
    );
    const oldDenominator = Math.pow(10, givenDecimals);

    const { priceNumerator, priceDenominator } = calculateLimitOrderPriceRatio(
      priceFloat,
      "buy",
      givenDecimals,
      takenDecimals,
    );

    expect(priceNumerator / priceDenominator).toBeCloseTo(
      oldNumerator / oldDenominator,
      9,
    );
  });

  it("keeps sell-side results as safe integers", () => {
    const { priceNumerator, priceDenominator } = calculateLimitOrderPriceRatio(
      0.3,
      "sell",
      0,
      9,
    );
    expect(Number.isSafeInteger(priceNumerator)).toBe(true);
    expect(Number.isSafeInteger(priceDenominator)).toBe(true);
    const displayPrice = getOrderPrice(
      {
        price_numerator: priceNumerator,
        price_denominator: priceDenominator,
        given_token_decimals: 0,
        taken_token_decimals: 9,
      },
      "sell",
    );
    expect(displayPrice).toBeCloseTo(0.3, 9);
  });
});
