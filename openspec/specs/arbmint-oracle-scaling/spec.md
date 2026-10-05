## ADDED Requirements

### Requirement: MintBoxState oracle_rate is stored in contract scale, serialized at display scale
The `MintBoxState.oracle_rate` field SHALL store the oracle price in "nanoERG per raw stablecoin unit" (the same scale the on-chain contract uses). It SHALL NOT include any `decimal_multiplier` scaling internally. The `decimal_multiplier` (10^stablecoin_decimals) SHALL only be applied at the API serialization boundary to produce display-scale values for consumers.

#### Scenario: USE (3 decimals) stores correct raw oracle rate
- **WHEN** `fetch_mint_box_state` is called for USE with `stablecoin_decimals=3` and raw oracle = 3,206,702,128 nanoERG/USD and divisor = 1000
- **THEN** `MintBoxState.oracle_rate` SHALL be 3,206,702 (raw / divisor, no decimal_multiplier)

#### Scenario: DexyGOLD (3 decimals) stores correct raw oracle rate
- **WHEN** `fetch_mint_box_state` is called for DexyGOLD with oracle divisor = 1,000,000 and raw oracle = 1,234,567,890,000,000 nanoERG/kg
- **THEN** `MintBoxState.oracle_rate` SHALL be 1,234,567,890 (raw / divisor)

#### Scenario: Zero decimals stablecoin stores correct raw rate
- **WHEN** `fetch_mint_box_state` is called with `stablecoin_decimals=0` and divisor = 1 and raw oracle = 500,000
- **THEN** `MintBoxState.oracle_rate` SHALL be 500,000

#### Scenario: API response serializes oracle_rate at display scale for USE
- **WHEN** `get_mint_status` returns for USE with internal `oracle_rate = 3,206,702` and `stablecoin_decimals = 3`
- **THEN** the serialized `oracle_rate` in MintBoxState SHALL be `3,206,702,000`
- **AND** `raw_oracle_rate` SHALL be `3,206,702`
- **AND** `stablecoin_decimals` SHALL be `3`

#### Scenario: API response for zero-decimal stablecoin
- **WHEN** `get_mint_status` returns for a zero-decimal stablecoin with internal `oracle_rate = 500,000` and `stablecoin_decimals = 0`
- **THEN** the serialized `oracle_rate` SHALL be `500,000` (no scaling)
- **AND** `raw_oracle_rate` SHALL be `500,000`

### Requirement: LP rate threshold check uses display-scaled oracle
The arbmint threshold comparison (`lp_rate > oracle_rate * (1 + margin_pct/100)`) SHALL compare both values at the same scale. Since `lp_rate` is stored at display scale (per whole stablecoin unit), the oracle rate SHALL be scaled to "per whole unit" at the comparison site before the check.

#### Scenario: USE threshold check uses scaled oracle
- **WHEN** `calculate_arbmint_availability` checks threshold for USE with `oracle_rate=3,206,702`, `lp_rate=4,717,820,949`, `threshold_percent=101`
- **THEN** the comparison SHALL be `4,717,820,949 > (3,206,702 * 1000) * 1.01` which is `4,717,820,949 > 3,238,769,020` → `true`

### Requirement: Max mint formula uses raw oracle rate
The max mint formula in `calculate_arbmint_availability` SHALL use the raw `MintBoxState.oracle_rate` directly. It SHALL NOT apply any `decimal_multiplier` to the oracle rate, since `lp_erg_reserves` and `lp_stablecoin_reserves` are already in raw units.

#### Scenario: Peak USE produces positive max mint
- **WHEN** `calculate_arbmint_availability` computes max mint for USE at peak (height 1,772,735) with `oracle_rate=3,206,702`, `lp_erg_reserves=315,633,624,607,790`, `lp_stablecoin_reserves=66,899,581`, `fee_denom=1000`, `bank_fee_num=3`, `buyback_fee_num=2`
- **THEN** `oracle_rate_with_fee` SHALL be `3,206,702 * 1.005 = 3,222,735.51`
- **AND** `max_from_formula` SHALL be `(315,633,624,607,790 - 3,222,735.51 * 66,899,581) / 3,222,735.51`
- **AND** SHALL be approximately 31,040,080 (positive, > 0)

#### Scenario: Below-threshold USE produces 0 max mint
- **WHEN** `calculate_arbmint_availability` computes max mint for USE at height 1,772,442 with `oracle_rate=3,190,017`, `lp_erg_reserves=258,682,963,995,335`, `lp_stablecoin_reserves=81,582,028`
- **THEN** `max_from_formula` SHALL be negative → clamped to 0
- **AND** `is_available` SHALL be false

### Requirement: Freemint path unaffected
`calculate_freemint_availability()` SHALL continue to work correctly with the raw `oracle_rate` value. Since freemint uses a different rate condition (`lpRate * rateNum > oracleRate * rateDenom`), it SHALL apply the `decimal_multiplier` at its comparison site.

#### Scenario: Freemint threshold check works with raw oracle
- **WHEN** `calculate_freemint_availability` checks rate for USE with `oracle_rate=3,206,702`, `lp_rate=4,717,820,949`, `rate_num=100`, `rate_denom=98`
- **THEN** the comparison SHALL be `lp_rate * 100 > (oracle_rate * 1000) * 98` → `4.7e9 * 100 > 3.2e9 * 98` → `true`

### Requirement: Tracking and allowance checks unaffected
The tracking delay (`tracking101Height < HEIGHT - T_arb`) and allowance (`tracking_r5 > 0`) checks in `calculate_arbmint_availability` SHALL be unaffected by the oracle scaling change. These checks do not use `oracle_rate`.

#### Scenario: Tracking not triggered blocks arbmint
- **WHEN** `tracking101_height` = INT_MAX and all other conditions are met
- **THEN** `is_available` SHALL be false with `TrackingNotTriggered` constraint

#### Scenario: Remaining allowance zero blocks arbmint
- **WHEN** `tracking_r5` = 0 and all other conditions are met
- **THEN** `is_available` SHALL be false with `NoRemainingAllowance` constraint