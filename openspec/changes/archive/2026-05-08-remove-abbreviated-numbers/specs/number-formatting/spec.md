## ADDED Requirements

### Requirement: formatFullNumber displays full numbers with comma separators

The system SHALL provide a `formatFullNumber(value: number, decimals?: number): string` utility function that formats financial absolute values with locale-aware thousands separators and no abbreviations (K, M, B, T).

#### Scenario: Number >= 1000 displayed in full
- **WHEN** `formatFullNumber(625201.67)` is called with default decimals
- **THEN** the result SHALL be `"625,201.67"` (locale: en-US) with no "K" suffix

#### Scenario: Number >= 1,000,000 displayed in full
- **WHEN** `formatFullNumber(1234567.89)` is called with default decimals
- **THEN** the result SHALL be `"1,234,567.89"` (locale: en-US) with no "M" suffix

#### Scenario: Number >= 1,000,000,000 displayed in full
- **WHEN** `formatFullNumber(5000000000)` is called with default decimals
- **THEN** the result SHALL be `"5,000,000,000.00"` (locale: en-US) with no "B" suffix

#### Scenario: Small decimal number uses default 2 decimal places
- **WHEN** `formatFullNumber(0.857142)` is called with default decimals
- **THEN** the result SHALL be `"0.86"` (rounded to 2 decimal places)

#### Scenario: Custom decimal places override default
- **WHEN** `formatFullNumber(0.857142, 3)` is called
- **THEN** the result SHALL be `"0.857"` (rounded to 3 decimal places)

#### Scenario: Zero decimal places for whole numbers
- **WHEN** `formatFullNumber(100.5, 0)` is called
- **THEN** the result SHALL be `"101"` (rounded, no decimal point)

#### Scenario: Negative numbers handled correctly
- **WHEN** `formatFullNumber(-1234.56)` is called with default decimals
- **THEN** the result SHALL be `"-1,234.56"` (locale: en-US)

#### Scenario: Zero value displayed cleanly
- **WHEN** `formatFullNumber(0)` is called with default decimals
- **THEN** the result SHALL be `"0.00"` (locale: en-US)

### Requirement: Decimal places capped at 9 maximum

The system SHALL enforce a hard maximum of 9 decimal places in all formatted number output, matching the Ergo blockchain's native precision limit of 9 decimal digits (1 nanoERG).

#### Scenario: Decimals parameter of 10 clamped to 9
- **WHEN** `formatFullNumber(1.123456789012, 10)` is called
- **THEN** the result SHALL be `"1.123456789"` (9 decimal places, not 10)

#### Scenario: No explicit decimals defaults to 2, within cap
- **WHEN** `formatFullNumber(1234.567890123)` is called without decimals parameter
- **THEN** the result SHALL be `"1,234.57"` (2 decimal places, since 2 < 9)

#### Scenario: Decimals of exactly 9 allowed
- **WHEN** `formatFullNumber(1.123456789, 9)` is called
- **THEN** the result SHALL be `"1.123456789"` (9 decimal places, not clamped)

### Requirement: Token amount display respects maximum decimal cap

The system SHALL display raw token amounts using `formatFullNumber` with a decimal count equal to `min(tokenDecimals, 9)`, ensuring that token precision metadata is respected without exceeding the platform-wide cap.

#### Scenario: ERG amount displayed with 9 decimals
- **WHEN** a raw ERG amount of `1.123456789` is formatted for display with ERG decimals (9)
- **THEN** the result SHALL be `"1.123456789"` (9 decimal places)

#### Scenario: CRUX amount displayed with 4 decimals
- **WHEN** a raw CRUX amount of `5.1234` is formatted for display with CRUX decimals (4)
- **THEN** the result SHALL be `"5.1234"` (4 decimal places, since 4 < 9)

#### Scenario: Token with decimals > 9 capped at 9
- **WHEN** a token with 18 decimals has value `1.123456789012345678` formatted
- **THEN** the result SHALL use at most 9 decimal places: `"1.123456789"`

### Requirement: Financial display sites use formatFullNumber

The system SHALL use `formatFullNumber` for all rendered absolute financial values across the platform, including TVL, volume, balance, position value, and circulation metrics. Compact-display contexts (tooltips, badges, sparklines) MAY continue using `formatNumber` or alternative formatters.

#### Scenario: TVL on liquidity page uses full number format
- **WHEN** the liquidity page renders a pool's TVL value
- **THEN** the value SHALL be displayed via `formatFullNumber` with no K/M/B/T suffixes

#### Scenario: Volume 24h on liquidity page uses full number format
- **WHEN** the liquidity page renders a pool's 24h volume
- **THEN** the value SHALL be displayed via `formatFullNumber` with no K/M/B/T suffixes

#### Scenario: Portfolio token balance uses full number format
- **WHEN** the portfolio page renders a token's balance amount
- **THEN** the value SHALL be displayed via `formatFullNumber` with no K/M/B/T suffixes

#### Scenario: USE stats cards use full number format
- **WHEN** the USE Analytics page renders stat card values (circulation, TVL, bank reserves)
- **THEN** the values SHALL be displayed via `formatFullNumber` with no K/M/B/T suffixes

#### Scenario: Order book amounts use full number format
- **WHEN** the order book renders bid/ask amounts
- **THEN** the amounts SHALL be displayed via `formatFullNumber` with no K/M/B/T suffixes

#### Scenario: Compact UI contexts may keep abbreviated formatting
- **WHEN** a tooltip, notification badge, or sparkline label needs to display a number in a constrained space
- **THEN** the display MAY continue using `formatNumber` or a compact abbreviated form

### Requirement: Migration preserves existing rounding intent

The system SHALL preserve existing decimal-place intent when migrating from `formatNumber` to `formatFullNumber`. Calls specifying `sigfig=0` or `sigfig=1` SHALL be replaced with calls that explicitly pass `0` or `1` as the decimals parameter to `formatFullNumber`.

#### Scenario: formatNumber(x, 0) migrated correctly
- **WHEN** a call site previously used `formatNumber(val, 0)` to show no decimal places
- **THEN** the replacement SHALL be `formatFullNumber(val, 0)`

#### Scenario: formatNumber(x, 2) migrated to default
- **WHEN** a call site previously used `formatNumber(val, 2)` (matching the new default)
- **THEN** the replacement SHALL be `formatFullNumber(val)` (defaults to 2 decimals)
