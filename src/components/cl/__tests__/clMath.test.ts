import {
  ApiRequestError,
  ERG_DEPOSIT_RESERVE_HUMAN,
  ERG_TOKEN_ID,
  classifyRangeSide,
  computeMaxDepositHuman,
  exceedsWalletBalance,
  formatAmountTrimmed,
  feeBpsToPercent,
  formatProtocolFeeBps,
  formatProtocolFeeFormula,
  formatTokenOptionLabel,
  formatWalletBalanceHuman,
  humanPriceToRaw,
  humanToRaw,
  isClNotDeployedError,
  isErgTokenInput,
  isValidFeeBps,
  limitOrderPriceRatio,
  normalizeClTokenIdInput,
  rawPriceToHuman,
  rawToHuman,
  reserveToWalletRaw,
  shortId,
  trimDecimalZeros,
  walletToReserveRaw,
} from "../clMath";

describe("isErgTokenInput / normalizeClTokenIdInput", () => {
  it("treats empty string as ERG", () => {
    expect(isErgTokenInput("")).toBe(true);
    expect(normalizeClTokenIdInput("")).toBe(ERG_TOKEN_ID);
  });

  it("treats 'ERG' (any case) as ERG", () => {
    expect(isErgTokenInput("erg")).toBe(true);
    expect(isErgTokenInput("ERG")).toBe(true);
    expect(normalizeClTokenIdInput("  erg  ")).toBe(ERG_TOKEN_ID);
  });

  it("passes through a real token id trimmed", () => {
    expect(isErgTokenInput("abcd1234")).toBe(false);
    expect(normalizeClTokenIdInput("  abcd1234  ")).toBe("abcd1234");
  });

  it("passes the real ERG_TOKEN_ID (64 zero hex chars) through unchanged", () => {
    expect(ERG_TOKEN_ID).toHaveLength(64);
    expect(isErgTokenInput(ERG_TOKEN_ID)).toBe(false);
    expect(normalizeClTokenIdInput(ERG_TOKEN_ID)).toBe(ERG_TOKEN_ID);
  });
});

describe("isValidFeeBps", () => {
  it("accepts 0 (no fee)", () => {
    expect(isValidFeeBps(0)).toBe(true);
  });

  it("accepts values up to but not including 10000", () => {
    expect(isValidFeeBps(9999)).toBe(true);
    expect(isValidFeeBps(10000)).toBe(false);
  });

  it("rejects negative values", () => {
    expect(isValidFeeBps(-1)).toBe(false);
  });

  it("rejects non-integers and NaN", () => {
    expect(isValidFeeBps(30.5)).toBe(false);
    expect(isValidFeeBps(NaN)).toBe(false);
  });

  it("accepts the standard presets", () => {
    [1, 5, 30, 100].forEach((bps) => expect(isValidFeeBps(bps)).toBe(true));
  });
});

describe("rawToHuman / humanToRaw", () => {
  it("round-trips through 9 decimals (ERG)", () => {
    const humanValue = 1.5;
    const raw = humanToRaw(humanValue, 9);
    expect(raw).toBe(1_500_000_000);
    expect(rawToHuman(raw, 9)).toBeCloseTo(humanValue, 9);
  });

  it("round-trips through 0 decimals", () => {
    expect(humanToRaw(42, 0)).toBe(42);
    expect(rawToHuman(42, 0)).toBe(42);
  });

  it("rounds humanToRaw to the nearest integer", () => {
    expect(humanToRaw(1.23456789, 2)).toBe(123);
  });
});

describe("rawPriceToHuman / humanPriceToRaw", () => {
  it("converts a raw price to human units accounting for decimal difference", () => {
    // token X (ERG, 9 decimals) / token Y (2 decimals): decX - decY = 7
    const rawPrice = 5;
    const human = rawPriceToHuman(rawPrice, 9, 2);
    expect(human).toBeCloseTo(5 * 1e7, 6);
  });

  it("is the inverse of humanPriceToRaw", () => {
    const decX = 9;
    const decY = 6;
    const humanPrice = 123.456;
    const raw = humanPriceToRaw(humanPrice, decX, decY);
    expect(rawPriceToHuman(raw, decX, decY)).toBeCloseTo(humanPrice, 6);
  });

  it("handles equal decimals (identity)", () => {
    expect(rawPriceToHuman(3.14, 6, 6)).toBeCloseTo(3.14);
    expect(humanPriceToRaw(3.14, 6, 6)).toBeCloseTo(3.14);
  });
});

describe("feeBpsToPercent", () => {
  it("converts basis points to percent", () => {
    expect(feeBpsToPercent(30)).toBe(0.3);
    expect(feeBpsToPercent(1)).toBe(0.01);
    expect(feeBpsToPercent(100)).toBe(1);
  });
});

describe("shortId", () => {
  it("leaves short ids untouched", () => {
    expect(shortId("abc123")).toBe("abc123");
  });

  it("truncates long ids with an ellipsis", () => {
    const id = "a".repeat(64);
    expect(shortId(id, 6)).toBe(`aaaaaa…aaaaaa`);
  });

  it("returns empty string for empty input", () => {
    expect(shortId("")).toBe("");
  });
});

describe("classifyRangeSide", () => {
  it("is single-sided holding only X below the range", () => {
    expect(classifyRangeSide(1, 2, 5)).toEqual({
      singleSided: true,
      holdsOnly: "x",
    });
  });

  it("is single-sided holding only Y above the range", () => {
    expect(classifyRangeSide(9, 2, 5)).toEqual({
      singleSided: true,
      holdsOnly: "y",
    });
  });

  it("is double-sided strictly inside the range", () => {
    expect(classifyRangeSide(3, 2, 5)).toEqual({
      singleSided: false,
      holdsOnly: null,
    });
  });

  it("treats the boundary itself as single-sided (matches contract: below Pa / above Pb)", () => {
    expect(classifyRangeSide(2, 2, 5).singleSided).toBe(true);
    expect(classifyRangeSide(5, 2, 5).singleSided).toBe(true);
  });
});

describe("formatProtocolFeeFormula", () => {
  it("matches the launch example (phi=1667, floor=1 bps)", () => {
    expect(formatProtocolFeeFormula(1667, 1)).toBe(
      "max(φ × LP fee, floor) = max(16.67% × LP fee, 1 bps)",
    );
  });

  it("drops trailing zeros from a whole-percent phi", () => {
    expect(formatProtocolFeeFormula(2500, 10)).toBe(
      "max(φ × LP fee, floor) = max(25% × LP fee, 10 bps)",
    );
  });

  it("keeps a single significant decimal when the second is zero", () => {
    expect(formatProtocolFeeFormula(1650, 1)).toBe(
      "max(φ × LP fee, floor) = max(16.5% × LP fee, 1 bps)",
    );
  });
});

describe("formatProtocolFeeBps", () => {
  it("formats a whole-number rate without decimals", () => {
    expect(formatProtocolFeeBps(100)).toBe("100 bps");
  });

  it("formats a fractional rate rounded to 2 decimals", () => {
    expect(formatProtocolFeeBps(8.335)).toBe("8.34 bps");
  });

  it("formats zero", () => {
    expect(formatProtocolFeeBps(0)).toBe("0 bps");
  });
});

describe("walletToReserveRaw / reserveToWalletRaw", () => {
  it("adds and removes the dust unit for a token", () => {
    expect(reserveToWalletRaw(3113, false)).toBe(3114);
    expect(walletToReserveRaw(3114, false)).toBe(3113);
    expect(walletToReserveRaw(1, false)).toBe(0);
  });

  it("leaves ERG unchanged", () => {
    expect(reserveToWalletRaw(5_000_000_000, true)).toBe(5_000_000_000);
    expect(walletToReserveRaw(5_000_000_000, true)).toBe(5_000_000_000);
  });
});

describe("computeMaxDepositHuman", () => {
  it("holds back the ERG reserve for ERG", () => {
    expect(computeMaxDepositHuman(5, true)).toBeCloseTo(5 - ERG_DEPOSIT_RESERVE_HUMAN, 9);
  });

  it("fills the whole balance for a non-ERG token", () => {
    expect(computeMaxDepositHuman(31.14, false)).toBe(31.14);
  });

  it("never goes negative when the balance is below the reserve", () => {
    expect(computeMaxDepositHuman(0.001, true)).toBe(0);
    expect(computeMaxDepositHuman(0, false)).toBe(0);
  });

  it("treats a non-finite balance as zero", () => {
    expect(computeMaxDepositHuman(NaN, false)).toBe(0);
    expect(computeMaxDepositHuman(Infinity, true)).toBe(0);
  });
});

describe("exceedsWalletBalance", () => {
  it("compares the wallet amount to the balance with no extra dust", () => {
    expect(exceedsWalletBalance(3114, 3114)).toBe(false);
    expect(exceedsWalletBalance(3115, 3114)).toBe(true);
  });
});

describe("trimDecimalZeros / formatAmountTrimmed", () => {
  it("only strips zeros after a decimal point", () => {
    expect(trimDecimalZeros("10")).toBe("10");
    expect(trimDecimalZeros("1.500")).toBe("1.5");
    expect(trimDecimalZeros("2.000")).toBe("2");
  });

  it("trims to 6 places by default", () => {
    expect(formatAmountTrimmed(90.283114619, 9)).toBe("90.283115");
    expect(formatAmountTrimmed(1.5, 9)).toBe("1.5");
  });

  it("never exceeds the token's decimals", () => {
    expect(formatAmountTrimmed(31.14, 2)).toBe("31.14");
    expect(formatAmountTrimmed(10, 0)).toBe("10");
  });

  it("honours a larger maxPlaces up to the decimals", () => {
    expect(formatAmountTrimmed(0.000000001, 9, 9)).toBe("0.000000001");
  });
});

describe("formatWalletBalanceHuman", () => {
  it("trims trailing zeros", () => {
    expect(formatWalletBalanceHuman(1)).toBe("1");
    expect(formatWalletBalanceHuman(1.5)).toBe("1.5");
  });

  it("formats zero as \"0\"", () => {
    expect(formatWalletBalanceHuman(0)).toBe("0");
  });

  it("caps precision at 6 decimals", () => {
    expect(formatWalletBalanceHuman(1.2345678)).toBe("1.234568");
  });

  it("treats a non-finite value as zero", () => {
    expect(formatWalletBalanceHuman(NaN)).toBe("0");
  });
});

describe("formatTokenOptionLabel", () => {
  it("formats name, balance, and short id", () => {
    const id = "a".repeat(64);
    expect(
      formatTokenOptionLabel({ tokenId: id, name: "SigUSD", decimals: 2, balanceHuman: 12.5 }),
    ).toBe(`SigUSD — 12.5 — ${shortId(id)}`);
  });

  it("formats ERG using ERG_TOKEN_ID", () => {
    expect(
      formatTokenOptionLabel({ tokenId: ERG_TOKEN_ID, name: "ERG", decimals: 9, balanceHuman: 3 }),
    ).toBe(`ERG — 3 — ${shortId(ERG_TOKEN_ID)}`);
  });
});

describe("limitOrderPriceRatio", () => {
  describe("sellX (give X, take Y)", () => {
    it("ERG (X, 9 decimals) against a 0-decimal token (Y)", () => {
      expect(limitOrderPriceRatio("sellX", 3, 9, 0)).toEqual({
        numerator: 3,
        denominator: 1e9,
      });
    });

    it("ERG (X, 9 decimals) against a 2-decimal token (Y)", () => {
      expect(limitOrderPriceRatio("sellX", 1.25, 9, 2)).toEqual({
        numerator: 125,
        denominator: 1e9,
      });
    });

    it("ERG (X, 9 decimals) against a 9-decimal token (Y)", () => {
      expect(limitOrderPriceRatio("sellX", 2.5, 9, 9)).toEqual({
        numerator: 2_500_000_000,
        denominator: 1e9,
      });
    });

    it("a 2-decimal token (X) against ERG (Y, 9 decimals)", () => {
      expect(limitOrderPriceRatio("sellX", 0.001, 2, 9)).toEqual({
        numerator: 1_000_000,
        denominator: 100,
      });
    });
  });

  describe("buyX (give Y, take X)", () => {
    it("ERG (X, 9 decimals) against a 0-decimal token (Y)", () => {
      expect(limitOrderPriceRatio("buyX", 4, 9, 0)).toEqual({
        numerator: 250_000_000,
        denominator: 1,
      });
    });

    it("ERG (X, 9 decimals) against a 2-decimal token (Y)", () => {
      expect(limitOrderPriceRatio("buyX", 2, 9, 2)).toEqual({
        numerator: 500_000_000,
        denominator: 100,
      });
    });

    it("a 2-decimal token (X) against ERG (Y, 9 decimals)", () => {
      expect(limitOrderPriceRatio("buyX", 0.5, 2, 9)).toEqual({
        numerator: 200,
        denominator: 1e9,
      });
    });
  });

  it("rounds the numerator up (ceil), never down", () => {
    // sellX: P = 1/3 -> 1000/3 = 333.33... raw Y units, ceils to 334.
    expect(limitOrderPriceRatio("sellX", 1 / 3, 9, 3)).toEqual({
      numerator: 334,
      denominator: 1e9,
    });

    // buyX: P = 3 (Y per X), decX = 0 -> 1/3 raw X unit, ceils to 1
    // (never 0 -- the taker must receive at least one raw unit of X).
    expect(limitOrderPriceRatio("buyX", 3, 0, 9)).toEqual({
      numerator: 1,
      denominator: 1e9,
    });
  });
});

describe("isClNotDeployedError", () => {
  it("is true for an error with status 503", () => {
    const err: ApiRequestError = new Error("CL is not deployed on this network");
    err.status = 503;
    expect(isClNotDeployedError(err)).toBe(true);
  });

  it("is false for an error with a different status", () => {
    const err: ApiRequestError = new Error("bad request");
    err.status = 400;
    expect(isClNotDeployedError(err)).toBe(false);
  });

  it("is false for a plain Error with no status", () => {
    expect(isClNotDeployedError(new Error("boom"))).toBe(false);
  });

  it("is false for non-error values", () => {
    expect(isClNotDeployedError(null)).toBe(false);
    expect(isClNotDeployedError(undefined)).toBe(false);
    expect(isClNotDeployedError("string error")).toBe(false);
  });
});
