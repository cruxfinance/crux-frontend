import { clFraction, depthBackground, depthSegments } from "../orderBookDepth";
import { exchangeLabel, isClExchange } from "@lib/utils/exchanges";

describe("depthSegments", () => {
  it("scales total and CL to the max", () => {
    expect(depthSegments(50, 10, 100)).toEqual({ totalPct: 50, clPct: 10 });
  });
  it("keeps CL within the total and both within 100", () => {
    expect(depthSegments(120, 150, 100)).toEqual({ totalPct: 100, clPct: 100 });
    expect(depthSegments(20, 30, 100)).toEqual({ totalPct: 20, clPct: 20 });
  });
  it("returns an empty bar for a zero max or bad input", () => {
    expect(depthSegments(5, 1, 0)).toEqual({ totalPct: 0, clPct: 0 });
    expect(depthSegments(NaN, 1, 10)).toEqual({ totalPct: 0, clPct: 0 });
    expect(depthSegments(-5, -1, 10)).toEqual({ totalPct: 0, clPct: 0 });
  });
});

describe("clFraction", () => {
  it("is the CL share of the amount", () => {
    expect(clFraction(25, 100)).toBe(0.25);
    expect(clFraction(200, 100)).toBe(1);
    expect(clFraction(0, 100)).toBe(0);
    expect(clFraction(5, 0)).toBe(0);
  });
});

describe("depthBackground", () => {
  it("uses a single tint without CL", () => {
    expect(depthBackground("#00ff00", { totalPct: 40, clPct: 0 }, "33")).toBe(
      "linear-gradient(to left, #00ff0033 40%, transparent 40%)",
    );
  });
  it("adds a stronger CL segment at the edge", () => {
    const bg = depthBackground("#00ff00", { totalPct: 40, clPct: 10 }, "33");
    expect(bg).toContain("#00ff0077 10%");
    expect(bg).toContain("#00ff0033 10%");
    expect(bg).toContain("transparent 40%");
  });
});

describe("exchangeLabel", () => {
  it("labels known codes, with code 5 as Crux CL", () => {
    expect(exchangeLabel(0)).toBe("Spectrum");
    expect(exchangeLabel(4)).toBe("TradeHouse");
    expect(exchangeLabel(5)).toBe("Crux CL");
    expect(exchangeLabel(99)).toBe("Unknown");
    expect(exchangeLabel(undefined)).toBe("Unknown");
    expect(isClExchange(5)).toBe(true);
    expect(isClExchange(3)).toBe(false);
  });
});
