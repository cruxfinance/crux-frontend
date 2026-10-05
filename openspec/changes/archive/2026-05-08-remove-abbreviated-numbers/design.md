## Context

The frontend currently uses a single `formatNumber()` utility across the entire codebase. This function is optimized for compact display — it abbreviates numbers >= 1000 with K/M/B/T suffixes and uses significant figures for small decimals. While useful for dashboards, it lacks precision for financial data where users expect to see exact values. Feedback from power users specifically calls out the "K" abbreviation as unacceptable for TVL, volume, and position values.

The existing `formatNumber()` also has no upper bound on decimal places — micro-value tokens (e.g., memecoins) can render with dozens of trailing digits.

A separate concern is future consistency: without a clear convention, developers will continue choosing between `formatNumber`, `toLocaleString`, `.toFixed()`, and raw number rendering ad-hoc.

## Goals / Non-Goals

**Goals:**
- Create a dedicated `formatFullNumber()` function for financial data display (TVL, volume, balances, position values)
- Full numbers with locale-aware comma separators (e.g., "1,234,567.89")
- Default 2-decimal rounding; configurable via second parameter
- Hard cap at 9 decimal places maximum (per Ergo's native decimal precision)
- No K/M/B/T abbreviations
- Migrate all financial display sites to use the new function

**Non-Goals:**
- Removing `formatNumber()` entirely — it may still have valid uses in compact UI contexts (tooltips, sparkline labels, notification badges)
- Changing chart axis/y-scale formatting (TradingView and Visx manage their own label formatting)
- Backend changes — this is purely a display-layer convention
- Changing how percentages, APR, share ratios, or other non-absolute-value metrics are formatted

## Decisions

### Decision 1: New function vs. modifying `formatNumber()`

**Chosen: New `formatFullNumber()` function.**

- `formatNumber()` has a well-known contract (abbreviated, compact) used by many callers not related to financial precision
- Changing its behavior risks unintended side effects in compact-display contexts
- A new function makes the migration explicit and searchable — we can grep for `formatFullNumber` to verify coverage
- **Alternative considered:** Add a `full` boolean flag to `formatNumber()`. Rejected: proliferates boolean parameters and makes the function harder to reason about.

### Decision 2: Implementation approach

**Chosen: `Intl.NumberFormat` with configurable decimal places.**

```ts
export const formatFullNumber = (num: number, decimals?: number): string => {
  const maxDecimals = Math.min(decimals ?? 2, 9);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: maxDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(num);
};
```

- `Intl.NumberFormat` handles locale-aware comma separators and rounding natively
- The `decimals` parameter defaults to 2, and `Math.min(decimals ?? 2, 9)` enforces the 9-decimal cap
- Negative numbers are handled transparently by the Intl API
- No string manipulation or regex needed — the browser does the work
- **Alternative considered:** Manual `.toFixed()` + regex comma insertion. Rejected: locale-unaware, brittle, and more code.

### Decision 3: Locale handling

**Chosen: `undefined` (browser default locale).**

- The platform doesn't target a specific locale; `undefined` uses the user's browser locale (e.g., "en-US" gets commas, "de-DE" gets periods)
- This matches the existing `toLocaleString()` usage in `UseStatsCards`
- **Alternative considered:** Hardcoding `"en-US"`. Rejected: unnecessarily anglocentric.

### Decision 4: Migration strategy

**Chosen: Direct replacement at each call site.**

- Each call to `formatNumber(x, 0)`, `formatNumber(x, 1)`, `formatNumber(x, 2)` where x is a financial absolute value gets replaced with `formatFullNumber(x)` or `formatFullNumber(x, <decimals>)`
- Call sites that already use `formatNumber(x, 2)` can be replaced 1:1 with `formatFullNumber(x)` (both use 2 decimals by default)
- Call sites that use `formatNumber(x, 0)` (no decimals) get replaced with `formatFullNumber(x, 0)` to preserve the existing rounding intent
- `UseStatsCards.tsx` uses `toLocaleString()` directly — replace with `formatFullNumber()` for consistency
- **Alternative considered:** Wrapping `formatNumber()` to intercept financial calls. Rejected: hides the migration and makes future grep/debugging harder.

### Decision 5: Token amount display

**Chosen: Token amounts (non-USD values) also use `formatFullNumber`.**

- When showing a raw token amount (e.g., "5.12345 USE"), decimals should reflect the token's natural decimal count, capped at 9
- Callers should pass `min(tokenDecimals, 9)` as the decimals parameter
- The existing `formatTokenAmount()` helper in `liquidity.tsx` can be updated to use `formatFullNumber` internally

## Risks / Trade-offs

- **Risk:** Some pages may look noisy with full numbers (e.g., "1,234,567.89123 ERG" in a compact table cell). → **Mitigation:** Formatting is configurable per call site; tables can use fewer decimals (e.g., `formatFullNumber(val, 0)` for ERG amounts) while detail views use full precision.
- **Risk:** `formatFullNumber` in compact contexts (mobile) may cause layout overflow. → **Mitigation:** The existing responsive breakpoints and `textOverflow: "ellipsis"` patterns already handle this. No new layout changes needed.
- **Risk:** Missing a call site means inconsistent display (some numbers abbreviated, some full). → **Mitigation:** Tasks checklist includes a grep audit step to find remaining `formatNumber` calls in financial contexts post-migration.
- **Trade-off:** Loss of compact display for large ERG amounts (e.g., "1,234,567.89" vs "1.2M"). This is intentional — the user explicitly asked for full precision over compactness.

## Open Questions

- None. The requirements are clear and scoped from the user feedback document.
