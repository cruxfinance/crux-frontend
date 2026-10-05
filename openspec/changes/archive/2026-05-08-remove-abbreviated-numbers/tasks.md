## 1. Core Utility

- [x] 1.1 Add `formatFullNumber(value: number, decimals?: number): string` to `src/lib/utils/general.ts`
- [x] 1.2 Add JSDoc comment explaining the function's contract (full numbers, no abbreviations, 9-decimal cap) and contrast with `formatNumber`

## 2. Liquidity Page

- [x] 2.1 Replace `formatNumber(pool.tvl_erg, 2)` with `formatFullNumber(pool.tvl_erg, 2)` on line 614 of `src/pages/liquidity.tsx`
- [x] 2.2 Replace `formatNumber(pool.tvl_erg * ergPrice, 0)` with `formatFullNumber(pool.tvl_erg * ergPrice, 0)` on line 620
- [x] 2.3 Replace `formatNumber(pool.volume_24h, 2)` with `formatFullNumber(pool.volume_24h, 2)` on line 629
- [x] 2.4 Update `formatTokenAmount` helper to use `formatFullNumber` internally, preserving the `min(decimals, 4)` cap pattern
- [x] 2.5 Replace `formatNumber(totalTvlUsd, 0)` with `formatFullNumber(totalTvlUsd, 0)` on line 371
- [x] 2.6 Replace `formatNumber(totalPositionsUsd, 2)` with `formatFullNumber(totalPositionsUsd, 2)` on line 379

## 3. Portfolio Page

- [x] 3.1 Replace all `formatNumber` calls in `src/pages/portfolio.tsx` that display absolute financial values
- [x] 3.2 Audit `src/components/portfolio/TokenSummary.tsx` and replace `formatNumber` for balance/value displays
- [x] 3.3 Audit `src/components/portfolio/positions/LiquidityPositions.tsx` and replace `formatNumber` for position values
- [x] 3.4 Audit `src/components/portfolio/positions/StakedPositions.tsx` and replace `formatNumber` for staked amounts
- [x] 3.5 Audit `src/components/portfolio/HistoricValues.tsx` — no formatNumber usage found, no changes needed

## 4. Trade Page

- [x] 4.1 Replace `formatNumber(tokenStats.volumeErg, 1)` with `formatFullNumber(tokenStats.volumeErg, 1)`
- [x] 4.2 Replace `formatNumber(tokenStats.volume, 0)` with `formatFullNumber(tokenStats.volume, 0)`

## 5. Order Book & Swap Widgets

- [x] 5.1 Replace `formatNumber` for bid/ask amounts in `src/components/trade/OrderBook.tsx` with `formatFullNumber`
- [x] 5.2 Replace `formatNumber` for quote amounts and totals in `src/components/trade/MarketOrderWidget.tsx` with `formatFullNumber`
- [x] 5.3 SwapWidget.tsx already clean — no formatNumber calls remain in display

## 6. USE Analytics Stats Cards

- [x] 6.1 Replace inline `toLocaleString()` in `src/components/dexy/UseStatsCards.tsx` with `formatFullNumber` from general.ts
- [x] 6.2 Verify reserve ratio uses `(ratio * 100).toFixed(3) + "%"` — percentages out of scope, confirmed unchanged

## 7. Token Page

- [x] 7.1 Replace `formatNumber` for price displays in `src/pages/tokens/[tokenId].tsx` with `formatFullNumber`, preserving 4-decimal precision
- [x] 7.2 Audit SwapWidget — already clean

## 8. Audit & Cleanup

- [x] 8.1 Run `grep` across `src/` for remaining `formatNumber(` calls — all display calls migrated. Remaining: `formatPL` (specialized P/L formatter with `noNeg` + color), commented-out code blocks, and TradingView `.setQuantity()` API call
- [x] 8.2 Verify `formatNumber` is NOT removed from `general.ts` — confirmed present
- [x] 8.3 Check that no `formatFullNumber` calls pass a decimals argument > 9 — all fine; function clamps internally
- [x] 8.4 Visual spot-check: all pages reviewed — numbers use `formatFullNumber` with no K/M/B/T suffixes

## 9. Test

- [x] 9.1 Add unit tests for `formatFullNumber` — 19 tests covering whole numbers, negatives, 0/2/3/6/9/10 decimals, billions, trillions, zero, NaN, Infinity
- [x] 9.2 Run existing tests — our new tests pass (19/19); 2 pre-existing failures in MintWidget.test.tsx and SwapWidget.test.tsx (missing MinerFeeProvider context in test setup — unrelated)
- [x] 9.3 Run `npm run build` — compiles cleanly ✓
