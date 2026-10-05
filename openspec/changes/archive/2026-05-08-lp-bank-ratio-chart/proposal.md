## Why

Power users want visibility into the ratio of ERGs in the LP pool versus ERGs in the Bank (LP/Bank ratio) as an additional health metric for the USE protocol. Currently this metric is not tracked or chartable in the USE Analytics page, leaving users to calculate it manually.

## What Changes

- **New chart metric**: "LP/Bank Ratio" added as a selectable option in the USE Analytics chart dropdown, showing `ergInCoreLp / ergInBank` over time
- **New `DexyMetric` type**: `"lp_bank_ratio"` added to the metric union type
- **Backend metric generation**: `ci-modules` and `ci-api` SHALL compute and serve the `lp_bank_ratio` metric from existing `erg_in_core_lp` and `erg_in_bank` analytics data
- **Dropdown only**: The metric appears only in the chart dropdown menu — no new stat card is added to the USE Analytics front page

## Capabilities

### New Capabilities
- `lp-bank-ratio-metric`: LP/Bank ratio as a first-class analytics metric for the USE stablecoin protocol — covers the metric identifier, computation formula, backend data aggregation, chart rendering in the dropdown, and formatting (rounded to 3 decimals)

### Modified Capabilities
- None — this is a new metric, not a change to existing spec-level behavior.

## Impact

- `src/lib/types/dexy.d.ts` — `DexyMetric` union type extended with `"lp_bank_ratio"`
- `src/components/dexy/UseAnalyticsChart.tsx` — `metricOptions` array extended with new option; `formatValue` rounds to 3 decimals
- `ci-modules/` — analytics history aggregation logic extended to compute and store `lp_bank_ratio` from `erg_in_core_lp` and `erg_in_bank`
- `ci-api/` — `dexy.getHistory` router serves the new metric when requested
