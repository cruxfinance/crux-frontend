import {
  ApiRequestError,
  ERG_TOKEN_ID,
  classifyRangeSide,
  feeBpsToPercent,
  formatProtocolFeeBps,
  formatProtocolFeeFormula,
  humanPriceToRaw,
  humanToRaw,
  isClNotDeployedError,
  isErgTokenInput,
  isValidFeeBps,
  normalizeClTokenIdInput,
  rawPriceToHuman,
  rawToHuman,
  shortId,
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
