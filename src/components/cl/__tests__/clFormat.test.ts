import {
  NO_VALUE,
  clPositionStatusLabel,
  formatAprFraction,
  estimateUsdFromErg,
  formatErgAmount,
  formatPortfolioValue,
  formatUsdAmount,
  sortPositionsInRangeFirst,
} from "../clFormat";

describe("sortPositionsInRangeFirst", () => {
  const pos = (id: string, in_range: boolean, erg_value: number) => ({
    id,
    in_range,
    erg_value,
  });

  it("puts in-range positions first, then by value descending", () => {
    const sorted = sortPositionsInRangeFirst([
      pos("out-big", false, 100),
      pos("in-small", true, 1),
      pos("in-big", true, 50),
      pos("out-small", false, 2),
    ]);
    expect(sorted.map((p) => p.id)).toEqual([
      "in-big",
      "in-small",
      "out-big",
      "out-small",
    ]);
  });

  it("is stable for ties and does not mutate its input", () => {
    const input = [pos("a", true, 5), pos("b", true, 5), pos("c", false, 5)];
    const copy = [...input];
    expect(sortPositionsInRangeFirst(input).map((p) => p.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(input).toEqual(copy);
  });
});

describe("formatAprFraction", () => {
  it("converts a fraction to a percentage", () => {
    expect(formatAprFraction(0.12)).toBe("12.00%");
    expect(formatAprFraction(0)).toBe("0.00%");
    expect(formatAprFraction(1.2345)).toBe("123.45%");
  });

  it("shows a placeholder for missing or non-finite values", () => {
    expect(formatAprFraction(null)).toBe(NO_VALUE);
    expect(formatAprFraction(undefined)).toBe(NO_VALUE);
    expect(formatAprFraction(NaN)).toBe(NO_VALUE);
  });

  it("caps absurd values", () => {
    expect(formatAprFraction(250)).toBe(">10,000%");
  });
});

describe("formatErgAmount / formatUsdAmount", () => {
  it("formats amounts and placeholders", () => {
    expect(formatErgAmount(1234.567)).toBe("1,234.57 ERG");
    expect(formatErgAmount(0)).toBe("0.00 ERG");
    expect(formatErgAmount(null)).toBe(NO_VALUE);
    expect(formatUsdAmount(1234.4)).toBe("$1,234");
    expect(formatUsdAmount(12.345, 2)).toBe("$12.35");
    expect(formatUsdAmount(null)).toBe(NO_VALUE);
  });
});

describe("formatPortfolioValue / estimateUsdFromErg", () => {
  it("picks the figure for the selected currency", () => {
    expect(formatPortfolioValue("ERG", 10, 5)).toBe("10.00 ERG");
    expect(formatPortfolioValue("USE", 10, 5)).toBe("$5.00");
    expect(formatPortfolioValue("USE", 10, null)).toBe(NO_VALUE);
  });

  it("derives USD from the position's value ratio", () => {
    expect(estimateUsdFromErg(2, 100, 50)).toBe(1);
    expect(estimateUsdFromErg(2, 0, 50)).toBeNull();
    expect(estimateUsdFromErg(null, 100, 50)).toBeNull();
    expect(estimateUsdFromErg(2, 100, null)).toBeNull();
  });
});

describe("clPositionStatusLabel", () => {
  it("labels retired positions as withdraw only, even when in range", () => {
    expect(clPositionStatusLabel({ withdraw_only: true, in_range: true })).toBe("Withdraw only");
  });
  it("labels current in-range positions", () => {
    expect(clPositionStatusLabel({ withdraw_only: false, in_range: true })).toBe("In range");
  });
  it("labels current out-of-range positions", () => {
    expect(clPositionStatusLabel({ withdraw_only: false, in_range: false })).toBe("Out of range");
  });
});
