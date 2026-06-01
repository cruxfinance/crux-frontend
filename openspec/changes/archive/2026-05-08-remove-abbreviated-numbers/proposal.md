## Why

The current `formatNumber()` utility abbreviates large numbers with K/M/B/T suffixes (e.g., "625.2K", "1.5M"). Power users find this imprecise and unprofessional for financial data — they want to see exact figures like "625,201.67" instead. Additionally, decimal places are currently unbounded, leading to excessively long displays for micro-value tokens. Establishing a single, precise formatting standard across the entire platform resolves both issues.

## What Changes

- **New formatting function**: A `formatFullNumber()` utility that displays full numbers with comma separators, rounded to 2 decimal places, and capped at 9 decimal places maximum
- **Deprecate K/M/B/T suffixes**: `formatNumber()` will no longer be the default for TVL, volume, and financial metrics — replaced by `formatFullNumber()` in all data-display contexts
- **Decimal cap enforcement**: All decimal displays capped at 9 figures (no value will display more than 9 decimal digits)
- **Platform-wide migration**: All pages and components displaying financial figures (TVL, volume, balance, position value) will use the new formatter

## Capabilities

### New Capabilities
- `number-formatting`: Standardized number display conventions across the Crux frontend — full precision with comma separators, 2-decimal rounding, and 9-decimal maximum cap. Covers formatting functions, migration rules, and display consistency requirements.

### Modified Capabilities
- None — this is a new formatting convention, not a change to existing spec-level requirements.

## Impact

- `src/lib/utils/general.ts` — new `formatFullNumber()` function added; `formatNumber()` preserved for non-financial use cases (if any remain)
- `src/pages/liquidity.tsx` — TVL table and pool volume columns migrate from `formatNumber` to `formatFullNumber`
- `src/pages/portfolio.tsx` — all balance, value, and summary metrics migrate
- `src/pages/trade.tsx` — volume stats in the pair header migrate
- `src/pages/tokens/[tokenId].tsx` — chart price labels and stats migrate
- `src/components/trade/OrderBook.tsx` — amounts in order rows migrate
- `src/components/trade/MarketOrderWidget.tsx` — quote amounts and totals migrate
- `src/components/trade/SwapWidget.tsx` — swap amounts migrate
- `src/components/dexy/UseStatsCards.tsx` — stat card values migrate (already uses `toLocaleString`, needs 9-decimal cap)
- `src/components/portfolio/*` — all sub-components showing token amounts and values
- Backend: no changes — formatting is display-only
