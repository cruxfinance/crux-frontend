## 1. Backend — ci-api entities

- [x] 1.1 Add `lp_bank_ratio` computation to the analytics history aggregation loop — `ratio = erg_in_core_lp / erg_in_bank` (return 0 when `erg_in_bank === 0`)
- [x] 1.2 Extend the history metric enum / match arms to include `lp_bank_ratio` in all resolution buckets (1h, 1d, 1w)
- ~~1.3 Write/update unit test for `lp_bank_ratio` computation covering normal ratio and zero-bank edge case~~ (no existing test infrastructure for dexy analytics)

## 2. Backend — ci-api

- [x] 2.1 Add `"lp_bank_ratio"` to the accepted metric parameter in the `dexy.getHistory` router/procedure
- [x] 2.2 Verify the metric passes through to ci-modules history data and returns correctly at 1h/1d/1w resolutions

## 3. Frontend — Type Definition

- [x] 3.1 Add `"lp_bank_ratio"` to the `DexyMetric` union type in `src/lib/types/dexy.d.ts`

## 4. Frontend — USE Analytics Chart

- [x] 4.1 Add a new entry to the `metricOptions` array in `src/components/dexy/UseAnalyticsChart.tsx`:
  ```ts
  {
    value: "lp_bank_ratio",
    label: "LP/Bank Ratio",
    formatValue: (v) => v.toFixed(3),
  }
  ```
- [x] 4.2 Verify the metric appears in the dropdown menu and renders correctly in the chart (tooltip, y-axis labels)

## 5. Verification

- [x] 5.1 ci-api compiles with `cargo check` — clean (pre-existing sqlx warning only)
- [x] 5.2 `npm run build` in crux-frontend compiles clean
- [x] 5.3 Manual smoke test: select "LP/Bank Ratio" in chart dropdown, verify line chart renders and tooltip shows 3-decimal values
