## Context

The USE Analytics chart already tracks 9 metrics via the `dexy.getHistory` tRPC endpoint. Adding a 10th metric (`lp_bank_ratio`) follows the existing pattern but requires backend work because the metric must be derived from two existing data points (`erg_in_core_lp` and `erg_in_bank`).

## Goals / Non-Goals

**Goals:**
- Add `lp_bank_ratio` as a selectable metric in the USE Analytics chart dropdown
- Backend computes and stores the ratio from existing analytics data
- Rounded to 3 decimal places in display
- Dropdown only — no new stat card

**Non-Goals:**
- Adding a front-page stat card
- Changing the chart component architecture

## Decisions

### Decision 1: Metric derivation

**Chosen: Compute ratio from existing `erg_in_core_lp` / `erg_in_bank` in ci-modules.**

- Both source metrics are already aggregated at each history point
- Computing during aggregation is cheaper than runtime calculation in API or frontend
- Ensures the ratio is available at all existing history resolutions (1h, 1d, 1w)

### Decision 2: Frontend integration

**Chosen: Follow existing `metricOptions` array pattern in `UseAnalyticsChart.tsx`.**

- Add `{ value: "lp_bank_ratio", label: "LP/Bank Ratio", formatValue: (v) => v.toFixed(3) }`
- No new components needed — the chart framework handles the rest

### Decision 3: Decimal precision

**Chosen: 3 decimal places.**

- User specified "rounded to 3 decimals" — the ratio is ~0.857, and 3 decimals provides meaningful precision for ratio analysis

## Risks / Trade-offs

- **Risk:** Division by zero if `erg_in_bank` is 0 at any history point. → **Mitigation:** Backend SHALL return 0 when `erg_in_bank === 0` (bank starts empty during protocol bootstrap).

## Open Questions

- None.
