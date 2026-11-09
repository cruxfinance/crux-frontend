import {
  displayFilledPercent,
  isPastExpiry,
  isV3Order,
  v3FilledPercent,
  v3ReceivedAmount,
} from "../limitOrderV3";

const base = {
  original_given_amount: 1000,
  remaining_given_amount: 600,
  taken_token_decimals: 2,
};

describe("limitOrderV3", () => {
  it("treats rows without version as v2", () => {
    expect(isV3Order({})).toBe(false);
    expect(isV3Order({ version: "v2" })).toBe(false);
    expect(isPastExpiry({ version: "v2", effective_status: "past_expiry" })).toBe(false);
  });

  it("detects past expiry on v3 rows only", () => {
    expect(isPastExpiry({ version: "v3", effective_status: "past_expiry" })).toBe(true);
    expect(isPastExpiry({ version: "v3", effective_status: "partial" })).toBe(false);
  });

  it("computes filled percent from total_sold and remaining", () => {
    expect(v3FilledPercent({ ...base, version: "v3", total_sold: 400 })).toBe(40);
    // fee deposit: original - remaining would say 40% here, sold says 25%
    expect(
      v3FilledPercent({ ...base, version: "v3", total_sold: 200, remaining_given_amount: 600 }),
    ).toBe(25);
    expect(v3FilledPercent({ ...base, version: "v3", total_sold: 0, remaining_given_amount: 0 })).toBe(0);
  });

  it("scales the received amount by taken decimals", () => {
    expect(v3ReceivedAmount({ ...base, version: "v3", total_bought: 12345 })).toBeCloseTo(123.45);
    expect(v3ReceivedAmount({ ...base, version: "v3" })).toBe(0);
  });

  it("never shows 100% for an order that is not complete", () => {
    expect(displayFilledPercent(100)).toBe("100");
    expect(displayFilledPercent(99.8)).toBe("99");
    expect(displayFilledPercent(99.9999)).toBe("99");
    expect(displayFilledPercent(40.7)).toBe("40");
    expect(displayFilledPercent(0.4)).toBe("0");
    expect(displayFilledPercent(0)).toBe("0");
    expect(displayFilledPercent(NaN)).toBe("0");
    const nearly = v3FilledPercent({
      ...base,
      version: "v3",
      total_sold: 998,
      remaining_given_amount: 2,
    });
    expect(displayFilledPercent(nearly)).toBe("99");
  });
});
