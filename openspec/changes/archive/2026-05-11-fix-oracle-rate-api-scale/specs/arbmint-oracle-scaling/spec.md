## MODIFIED Requirements

### Requirement: MintBoxState oracle_rate is stored in contract scale
The `MintBoxState.oracle_rate` field SHALL store the oracle price at contract scale (nanoERG per raw stablecoin unit). It SHALL NOT include any `decimal_multiplier` scaling. The `decimal_multiplier` (10^stablecoin_decimals) SHALL only be applied at comparison sites that need "per whole unit" values, and at the API serialization boundary to produce display-scale values for consumers.

#### Scenario: USE (3 decimals) stores correct raw oracle rate
- **WHEN** `fetch_mint_box_state` is called for USE with `stablecoin_decimals=3` and raw oracle = 3,206,702,128 nanoERG/USD and divisor = 1000
- **THEN** `MintBoxState.oracle_rate` SHALL be 3,206,702 (raw / divisor, no decimal_multiplier)

#### Scenario: DexyGOLD (3 decimals) stores correct raw oracle rate
- **WHEN** `fetch_mint_box_state` is called for DexyGOLD with oracle divisor = 1,000,000 and raw oracle = 1,234,567,890,000,000 nanoERG/kg
- **THEN** `MintBoxState.oracle_rate` SHALL be 1,234,567,890 (raw / divisor)

#### Scenario: Zero decimals stablecoin stores correct raw rate
- **WHEN** `fetch_mint_box_state` is called with `stablecoin_decimals=0` and divisor = 1 and raw oracle = 500,000
- **THEN** `MintBoxState.oracle_rate` SHALL be 500,000

### Requirement: API boundary presents oracle_rate at display scale
The `MintBoxState.oracle_rate` field SHALL be serialized at display scale (nanoERG per whole stablecoin unit) in the API response, computed as `oracle_rate * 10^stablecoin_decimals`. The `get_mint_status` function SHALL include `raw_oracle_rate` (contract scale) and `stablecoin_decimals` in the `MintStatus` response alongside the display-scale `oracle_rate`.

#### Scenario: API response serializes oracle_rate at display scale for USE
- **WHEN** `get_mint_status` returns for USE with internal `oracle_rate = 3,206,702` and `stablecoin_decimals = 3`
- **THEN** the serialized `oracle_rate` in MintBoxState SHALL be `3,206,702,000`
- **AND** `raw_oracle_rate` SHALL be `3,206,702`
- **AND** `stablecoin_decimals` SHALL be `3`

#### Scenario: API response for zero-decimal stablecoin
- **WHEN** `get_mint_status` returns for a zero-decimal stablecoin with internal `oracle_rate = 500,000` and `stablecoin_decimals = 0`
- **THEN** the serialized `oracle_rate` SHALL be `500,000` (no scaling)
- **AND** `raw_oracle_rate` SHALL be `500,000`