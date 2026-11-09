import {
  bigIntSqrt,
  bpsToPercentText,
  clPriceRightPerLeft,
  cpKindFor,
  lpTokensPreview,
  parseRaw,
  poolPriceRightPerLeft,
  priceDifference,
  rawToText,
} from "../cpCreateMath";
import { ERG_TOKEN_ID } from "../clMath";
import type { PoolWithApr } from "../../liquidity/liquidityTypes";

const big = (n: number | string) => BigInt(n);

describe("lpTokensPreview", () => {
  it("is floor(sqrt(x*y))", () => {
    expect(lpTokensPreview(big(4), big(9))).toBe(big(6));
    expect(lpTokensPreview(big(10), big(10))).toBe(big(10));
    expect(lpTokensPreview(big(2), big(3))).toBe(big(2)); // sqrt(6) = 2.44
  });

  it("is exact for a product above 2^53", () => {
    const x = big("123456789012345"); // 1.2e14
    const y = big("98765432109876543");
    const product = x * y;
    expect(product > big(Number.MAX_SAFE_INTEGER)).toBe(true);
    const root = lpTokensPreview(x, y);
    expect(root * root <= product).toBe(true);
    expect((root + big(1)) * (root + big(1)) > product).toBe(true);
    // A Number-based sqrt cannot get here.
    expect(root).toBe(big("3491885323675752"));
  });

  it("is exact on perfect squares of large values", () => {
    const r = big("3037000499976049"); // ~ sqrt(2^63)
    expect(lpTokensPreview(r, r)).toBe(r);
    expect(bigIntSqrt(r * r - big(1))).toBe(r - big(1));
  });

  it("is zero without both amounts", () => {
    expect(lpTokensPreview(big(0), big(5))).toBe(big(0));
    expect(lpTokensPreview(big(5), big(0))).toBe(big(0));
  });
});

describe("amount helpers", () => {
  it("parses typed text to raw units without float error", () => {
    expect(parseRaw("0.1", 9)).toBe(big("100000000"));
    expect(parseRaw("1234567.123456789", 9)).toBe(big("1234567123456789"));
    expect(parseRaw("", 9)).toBe(big(0));
    expect(parseRaw("-1", 9)).toBe(big(0));
  });

  it("formats raw units exactly", () => {
    expect(rawToText(big("2400000000"), 9)).toBe("2.4");
    expect(rawToText(big("1"), 9)).toBe("0.000000001");
    expect(rawToText(big("12345"), 0)).toBe("12345");
  });

  it("formats fee tiers", () => {
    expect([5, 30, 100, 150, 500].map(bpsToPercentText)).toEqual(["0.05", "0.3", "1", "1.5", "5"]);
  });
});

describe("market price comparison", () => {
  const pool = {
    base_token_id: "tok",
    base_amount: 1_000_000,
    base_token_decimals: 4,
    quote_token_id: ERG_TOKEN_ID,
    quote_amount: 50_000_000_000,
    quote_token_decimals: 9,
  } as PoolWithApr;

  it("prices the left token in the right token either way round", () => {
    expect(poolPriceRightPerLeft(pool, "tok")).toBeCloseTo(0.5);
    expect(poolPriceRightPerLeft(pool, ERG_TOKEN_ID)).toBeCloseTo(2);
  });

  it("converts the CL price (Y per X)", () => {
    expect(clPriceRightPerLeft(4, "x", "x")).toBe(4);
    expect(clPriceRightPerLeft(4, "y", "x")).toBe(0.25);
    expect(clPriceRightPerLeft(null, "y", "x")).toBeNull();
  });

  it("computes the relative difference", () => {
    expect(priceDifference(1.03, 1)).toBeCloseTo(0.03);
    expect(priceDifference(1, null)).toBeNull();
  });
});

describe("cpKindFor", () => {
  it("is n2t when either side is ERG", () => {
    expect(cpKindFor(ERG_TOKEN_ID, "a")).toBe("n2t");
    expect(cpKindFor("a", ERG_TOKEN_ID)).toBe("n2t");
    expect(cpKindFor("a", "b")).toBe("t2t");
  });
});
