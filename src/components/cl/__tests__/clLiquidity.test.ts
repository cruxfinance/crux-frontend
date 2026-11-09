import {
  axisTicks,
  bucketLiquidity,
  buildClRequestBody,
  clOrientation,
  combineApr,
  computeDomain,
  dragHandle,
  emptyClPair,
  filterMergedPairs,
  formatPriceCompact,
  invertRange,
  mergePoolsAndClPairs,
  pairKey,
  positionDisplayRange,
  presetRange,
  priceToX,
  rangeBarLayout,
  sortMergedPairs,
  valueSplitPct,
  xToPrice,
} from "../clLiquidity";
import { ERG_TOKEN_ID } from "../clMath";
import type { ClPairStats } from "../clTypes";
import type { PoolWithApr } from "../../liquidity/liquidityTypes";

const TOKEN = "a".repeat(64);
const TOKEN2 = "b".repeat(64);

const pool = (over: Partial<PoolWithApr> = {}): PoolWithApr => ({
  pool_id: "p1",
  pool_type: "spectrum",
  base_token_id: ERG_TOKEN_ID,
  base_token_name: "erg",
  base_token_decimals: 9,
  quote_token_id: TOKEN,
  quote_token_name: "RSN",
  quote_token_decimals: 3,
  base_amount: 1e12,
  quote_amount: 1e6,
  tvl_erg: 1000,
  fee_pct: 1,
  volume_24h: 50,
  apr_7d: 10,
  apr_30d: 12,
  ...over,
});

const clPair = (over: Partial<ClPairStats> = {}): ClPairStats => ({
  token_x: ERG_TOKEN_ID,
  token_y: TOKEN,
  positions: 3,
  positions_in_range: 2,
  reserve_x: 0,
  reserve_y: 0,
  price_current: 1,
  tvl_erg: 500,
  tvl_usd: null,
  volume_24h_erg: 25,
  volume_7d_erg: 0,
  fees_24h_erg: 0,
  fees_7d_erg: 0,
  apr: 0.4,
  ...over,
});

describe("pairKey / clOrientation", () => {
  it("is order independent", () => {
    expect(pairKey("a", "b")).toBe(pairKey("b", "a"));
  });
  it("puts ERG first, else the smaller id", () => {
    expect(clOrientation(TOKEN, ERG_TOKEN_ID)).toEqual([ERG_TOKEN_ID, TOKEN]);
    expect(clOrientation(TOKEN2, TOKEN)).toEqual([TOKEN, TOKEN2]);
  });
});

describe("combineApr", () => {
  it("weights by TVL", () => {
    expect(
      combineApr([
        { tvl: 1000, apr: 10 },
        { tvl: 500, apr: 40 },
      ]),
    ).toBeCloseTo(20);
  });
  it("ignores null APRs and returns null when none", () => {
    expect(combineApr([{ tvl: 10, apr: null }])).toBeNull();
    expect(combineApr([{ tvl: 10, apr: null }, { tvl: 5, apr: 8 }])).toBe(8);
  });
  it("falls back to a plain mean when no TVL is known", () => {
    expect(combineApr([{ tvl: null, apr: 4 }, { tvl: null, apr: 8 }])).toBe(6);
  });
});

describe("mergePoolsAndClPairs", () => {
  it("merges a pool and a CL pair of the same pair into one row", () => {
    const rows = mergePoolsAndClPairs([pool()], [clPair()], {});
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.tvl_erg).toBe(1500);
    expect(r.volume_24h).toBe(75);
    expect(r.fee_pct).toBe(1);
    // (10*1000 + 40*500) / 1500 = 20
    expect(r.apr_7d).toBeCloseTo(20);
    expect(r.cl?.positions_in_range).toBe(2);
    expect(r.pool?.pool_id).toBe("p1");
    expect(r.tokenX).toBe(ERG_TOKEN_ID);
    expect(r.nameY).toBe("RSN");
    // display order keeps "TOKEN / ERG"
    expect(r.leftId).toBe(TOKEN);
    expect(r.rightId).toBe(ERG_TOKEN_ID);
  });

  it("matches by the unordered pair", () => {
    const rows = mergePoolsAndClPairs(
      [pool({ base_token_id: TOKEN, quote_token_id: ERG_TOKEN_ID })],
      [clPair()],
      {},
    );
    expect(rows).toHaveLength(1);
  });

  it("keeps pool-only and CL-only pairs", () => {
    const rows = mergePoolsAndClPairs(
      [pool()],
      [clPair({ token_x: TOKEN, token_y: TOKEN2, tvl_erg: null, apr: null })],
      { [TOKEN]: { name: "AAA", decimals: 2 }, [TOKEN2]: { name: "BBB", decimals: 4 } },
    );
    expect(rows).toHaveLength(2);
    const clOnly = rows.find((r) => !r.pool)!;
    expect(clOnly.nameX).toBe("AAA");
    expect(clOnly.decimalsY).toBe(4);
    expect(clOnly.tvl_erg).toBeNull();
    expect(clOnly.apr_7d).toBeNull();
    expect(clOnly.fee_pct).toBeNull();
    const poolOnly = rows.find((r) => r.key === pairKey(ERG_TOKEN_ID, TOKEN))!;
    expect(poolOnly.cl).toBeNull();
    expect(poolOnly.tvl_erg).toBe(1000);
    expect(poolOnly.apr_7d).toBe(10);
  });

  it("uses the CL price-less pool tvl when CL TVL is unknown", () => {
    const [r] = mergePoolsAndClPairs([pool()], [clPair({ tvl_erg: null, apr: null })], {});
    expect(r.tvl_erg).toBe(1000);
    expect(r.apr_7d).toBe(10);
  });

  it("picks the largest pool as primary and sums TVL over pools", () => {
    const [r] = mergePoolsAndClPairs(
      [pool({ pool_id: "small", tvl_erg: 10 }), pool({ pool_id: "big", tvl_erg: 90 })],
      [],
      {},
    );
    expect(r.pool?.pool_id).toBe("big");
    expect(r.tvl_erg).toBe(100);
  });
});

describe("sortMergedPairs / filterMergedPairs", () => {
  const rows = mergePoolsAndClPairs(
    [
      pool({ pool_id: "a", quote_token_id: TOKEN, quote_token_name: "AAA", tvl_erg: 10, apr_7d: 5 }),
      pool({ pool_id: "b", quote_token_id: TOKEN2, quote_token_name: "BBB", tvl_erg: 30, apr_7d: null }),
    ],
    [clPair({ token_y: "c".repeat(64), tvl_erg: null, apr: null })],
    { ["c".repeat(64)]: { name: "CCC", decimals: 0 } },
  );

  it("sorts descending with null values last", () => {
    expect(sortMergedPairs(rows, "tvl_erg", "desc").map((r) => r.nameY)).toEqual(["BBB", "AAA", "CCC"]);
  });
  it("sorts ascending with null values still last", () => {
    expect(sortMergedPairs(rows, "tvl_erg", "asc").map((r) => r.nameY)).toEqual(["AAA", "BBB", "CCC"]);
    expect(sortMergedPairs(rows, "apr_7d", "asc").map((r) => r.nameY)[0]).toBe("AAA");
  });
  it("does not mutate the input", () => {
    const copy = [...rows];
    sortMergedPairs(rows, "tvl_erg", "asc");
    expect(rows).toEqual(copy);
  });
  it("filters by token name, case-insensitively", () => {
    expect(filterMergedPairs(rows, "bb").map((r) => r.nameY)).toEqual(["BBB"]);
    expect(filterMergedPairs(rows, "").length).toBe(3);
    expect(filterMergedPairs(rows, "erg").length).toBe(3);
    expect(filterMergedPairs(rows, "zzz").length).toBe(0);
  });
});

describe("presets and orientation", () => {
  it("builds symmetric +-pct ranges", () => {
    const r = presetRange(100, 5);
    expect(r.min).toBeCloseTo(95);
    expect(r.max).toBeCloseTo(105);
  });
  it("inverts a range and swaps the bounds", () => {
    const r = invertRange({ min: 2, max: 4 });
    expect(r.min).toBeCloseTo(0.25);
    expect(r.max).toBeCloseTo(0.5);
  });
  it("converts raw position bounds to a display range in either orientation", () => {
    // raw 1e-6 Y-per-X with decX 9, decY 3 -> human 1e-6 * 1e6 = 1
    const direct = positionDisplayRange(0.5e-6, 2e-6, 9, 3, false);
    expect(direct.min).toBeCloseTo(0.5);
    expect(direct.max).toBeCloseTo(2);
    const inv = positionDisplayRange(0.5e-6, 2e-6, 9, 3, true);
    expect(inv.min).toBeCloseTo(0.5);
    expect(inv.max).toBeCloseTo(2);
    const skew = positionDisplayRange(1e-6, 4e-6, 9, 3, true);
    expect(skew.min).toBeCloseTo(0.25);
    expect(skew.max).toBeCloseTo(1);
  });
});

describe("bucketLiquidity", () => {
  it("sums liquidity of ranges covering each bucket", () => {
    const b = bucketLiquidity(
      [
        { min: 1, max: 4, liquidity: 10 },
        { min: 2, max: 8, liquidity: 5 },
      ],
      1,
      8,
      3,
    );
    // log buckets: [1,2) [2,4) [4,8); midpoints ~1.41, ~2.83, ~5.66
    expect(b.map((x) => x.liquidity)).toEqual([10, 15, 5]);
    expect(b[0].start).toBeCloseTo(1);
    expect(b[2].end).toBeCloseTo(8);
  });
  it("returns nothing for an invalid domain", () => {
    expect(bucketLiquidity([], 0, 5, 4)).toEqual([]);
    expect(bucketLiquidity([], 5, 5, 4)).toEqual([]);
  });
  it("ignores empty liquidity", () => {
    const b = bucketLiquidity([{ min: 1, max: 8, liquidity: 0 }], 1, 8, 2);
    expect(b.every((x) => x.liquidity === 0)).toBe(true);
  });
});

describe("price <-> pixel mapping", () => {
  it("maps the domain ends to 0 and width", () => {
    expect(priceToX(1, 1, 100, 200)).toBeCloseTo(0);
    expect(priceToX(100, 1, 100, 200)).toBeCloseTo(200);
    expect(priceToX(10, 1, 100, 200)).toBeCloseTo(100);
  });
  it("round-trips", () => {
    for (const p of [1.5, 7, 42, 99]) {
      expect(xToPrice(priceToX(p, 1, 100, 300), 1, 100, 300)).toBeCloseTo(p);
    }
  });
});

describe("dragHandle", () => {
  const range = { min: 90, max: 110 };
  it("moves a handle within the domain", () => {
    expect(dragHandle("min", 80, range, 50, 200)).toEqual({ min: 80, max: 110 });
    expect(dragHandle("max", 150, range, 50, 200)).toEqual({ min: 90, max: 150 });
  });
  it("clamps to the domain", () => {
    expect(dragHandle("min", 1, range, 50, 200).min).toBe(50);
    expect(dragHandle("max", 999, range, 50, 200).max).toBe(200);
  });
  it("cannot cross the other handle", () => {
    expect(dragHandle("min", 500, range, 50, 200).min).toBeLessThan(110);
    expect(dragHandle("max", 1, range, 50, 200).max).toBeGreaterThan(90);
  });
});

describe("computeDomain / axisTicks", () => {
  it("includes the current price and selection with headroom", () => {
    const d = computeDomain(100, { min: 50, max: 300 }, []);
    expect(d.min).toBeLessThan(50);
    expect(d.max).toBeGreaterThan(300);
  });
  it("clips very wide positions to a factor of the current price", () => {
    const d = computeDomain(100, null, [{ min: 0.001, max: 1e9 }], { maxSpan: 6, pad: 1 });
    expect(d.min).toBeCloseTo(100 / 6);
    expect(d.max).toBeCloseTo(600);
  });
  it("gives evenly log-spaced ticks including both ends", () => {
    const t = axisTicks(1, 100, 3);
    expect(t[0]).toBeCloseTo(1);
    expect(t[1]).toBeCloseTo(10);
    expect(t[2]).toBeCloseTo(100);
  });
});

describe("valueSplitPct", () => {
  it("splits by value in Y units", () => {
    // 10 X at price 2 = 20 Y, plus 20 Y -> 50/50
    expect(valueSplitPct(10, 20, 2)).toEqual({ xPct: 50, yPct: 50 });
  });
  it("is single-sided when one amount is zero", () => {
    expect(valueSplitPct(0, 5, 2)).toEqual({ xPct: 0, yPct: 100 });
  });
  it("is null for an empty deposit", () => {
    expect(valueSplitPct(0, 0, 2)).toBeNull();
  });
});

describe("rangeBarLayout", () => {
  it("places the marker inside the range when the price is in range", () => {
    const l = rangeBarLayout(90, 110, 100);
    expect(l.startPct).toBeGreaterThanOrEqual(0);
    expect(l.endPct).toBeLessThanOrEqual(100);
    expect(l.markerPct).toBeGreaterThan(l.startPct);
    expect(l.markerPct).toBeLessThan(l.endPct);
  });
  it("places the marker outside the range when out of range, still on the track", () => {
    const l = rangeBarLayout(90, 110, 130);
    expect(l.markerPct).toBeGreaterThan(l.endPct);
    expect(l.markerPct).toBeLessThanOrEqual(100.0001);
  });
});

describe("buildClRequestBody", () => {
  const base = {
    tokenX: ERG_TOKEN_ID,
    tokenY: TOKEN,
    decimalsX: 9,
    decimalsY: 3,
    minPrice: 1,
    maxPrice: 2,
    side: "x" as const,
    amount: 1.5,
    feePpm: 3000,
  };
  it("converts human prices and amounts to raw", () => {
    const b = buildClRequestBody(base)!;
    expect(b.price_lower).toBeCloseTo(1e-6);
    expect(b.price_upper).toBeCloseTo(2e-6);
    expect(b.amount_x).toBe(1.5e9);
    expect(b.amount_y).toBeUndefined();
    expect(b.fee_ppm).toBe(3000);
    expect(b.price_current).toBeUndefined();
  });
  it("uses the y side and a manual starting price", () => {
    const b = buildClRequestBody({ ...base, side: "y", amount: 2, currentPrice: 1.5 })!;
    expect(b.amount_y).toBe(2000);
    expect(b.price_current).toBeCloseTo(1.5e-6);
  });
  it("returns null for incomplete input", () => {
    expect(buildClRequestBody({ ...base, amount: 0 })).toBeNull();
    expect(buildClRequestBody({ ...base, maxPrice: 1 })).toBeNull();
    expect(buildClRequestBody({ ...base, minPrice: NaN })).toBeNull();
  });
});

describe("formatPriceCompact", () => {
  it("scales decimals with magnitude", () => {
    expect(formatPriceCompact(12345.6)).toBe("12,346");
    expect(formatPriceCompact(1.23456)).toBe("1.2346");
    expect(formatPriceCompact(0.0123456)).toBe("0.01235");
    expect(formatPriceCompact(NaN)).toBe("—");
  });
});

describe("emptyClPair", () => {
  const erg = { id: ERG_TOKEN_ID, name: "ERG", decimals: 9 };
  const tok = { id: TOKEN, name: "TOK", decimals: 4 };

  it("orients ERG as X regardless of argument order", () => {
    for (const p of [emptyClPair(tok, erg), emptyClPair(erg, tok)]) {
      expect(p.tokenX).toBe(ERG_TOKEN_ID);
      expect(p.tokenY).toBe(TOKEN);
      expect(p.nameX).toBe("ERG");
      expect(p.decimalsX).toBe(9);
      expect(p.nameY).toBe("TOK");
      expect(p.decimalsY).toBe(4);
      expect(p.leftId).toBe(TOKEN);
      expect(p.rightId).toBe(ERG_TOKEN_ID);
      expect(p.key).toBe(pairKey(ERG_TOKEN_ID, TOKEN));
    }
  });

  it("orders two tokens by id and carries no venue data", () => {
    const t2 = { id: TOKEN2, name: "T2", decimals: 2 };
    const p = emptyClPair(t2, tok);
    expect(p.tokenX).toBe(TOKEN);
    expect(p.tokenY).toBe(TOKEN2);
    expect(p.nameY).toBe("T2");
    expect(p.pool).toBeNull();
    expect(p.cl).toBeNull();
    expect(p.pools).toEqual([]);
    expect(p.spectrum).toBeNull();
    expect(p.clSplit).toBeNull();
    expect(p.tvl_erg).toBeNull();
  });
});
