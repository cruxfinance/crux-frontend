## ADDED Requirements

### Requirement: LP/Bank ratio metric identifier

The system SHALL define `"lp_bank_ratio"` as a valid `DexyMetric` value representing the ratio of ERGs in the core LP pool to ERGs in the Bank.

#### Scenario: Metric type includes lp_bank_ratio
- **WHEN** the `DexyMetric` union type is inspected
- **THEN** `"lp_bank_ratio"` SHALL be a valid member of the union

### Requirement: LP/Bank ratio computation formula

The system SHALL compute the LP/Bank ratio as `ergInCoreLp / ergInBank` at each history data point. When `ergInBank` is 0, the ratio SHALL be returned as 0.

#### Scenario: Normal ratio calculation
- **WHEN** `ergInCoreLp` is 500 and `ergInBank` is 1000
- **THEN** the `lp_bank_ratio` SHALL be `0.5`

#### Scenario: Zero bank ERG returns zero
- **WHEN** `ergInBank` is 0
- **THEN** the `lp_bank_ratio` SHALL be `0` (division by zero avoided)

### Requirement: LP/Bank ratio displayed with 3 decimal places

The system SHALL display the LP/Bank ratio rounded to 3 decimal places in chart tooltips and axis labels.

#### Scenario: Ratio formatted in chart
- **WHEN** a history point has `lp_bank_ratio` value of `0.857142`
- **THEN** the displayed value SHALL be `"0.857"` (3 decimal places, trailing zeros trimmed by toFixed)

### Requirement: LP/Bank ratio in chart dropdown only

The system SHALL make the LP/Bank ratio available ONLY as a selectable option in the USE Analytics chart dropdown menu. No new stat card SHALL be added to the USE Analytics front page.

#### Scenario: Metric appears in dropdown
- **WHEN** user opens the metric selector dropdown on the USE Analytics chart
- **THEN** "LP/Bank Ratio" SHALL appear as a selectable option among the existing metrics

#### Scenario: No front-page stat card for LP/Bank ratio
- **WHEN** the USE Analytics page renders the stat cards section
- **THEN** no card for LP/Bank Ratio SHALL be present

### Requirement: Backend serves LP/Bank ratio history

The system SHALL compute and serve `lp_bank_ratio` history data through the `dexy.getHistory` endpoint at all existing resolutions (1h, 1d, 1w).

#### Scenario: History query for lp_bank_ratio
- **WHEN** the `dexy.getHistory` procedure is called with metric `"lp_bank_ratio"` and resolution `"1d"`
- **THEN** an array of `DexyHistoryPoint` objects SHALL be returned, each with a `value` field containing the computed ratio for that time point

#### Scenario: History matches existing resolutions
- **WHEN** `lp_bank_ratio` history is requested at 1h, 1d, or 1w resolution
- **THEN** the endpoint SHALL return data at the requested resolution using the same bucketing logic as other metrics
