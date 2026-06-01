## ADDED Requirements

### Requirement: MintStatus includes raw_oracle_rate
The `MintStatus` response SHALL include a `raw_oracle_rate` field that contains the oracle rate at contract scale (nanoERG per raw stablecoin unit). The value SHALL be the same as the internal `MintBoxState.oracle_rate` — i.e., `raw_oracle_price / oracle_rate_divisor` without any `decimal_multiplier` scaling.

#### Scenario: USE (3 decimals) raw_oracle_rate
- **WHEN** internal `oracle_rate` is `3,206,702` (contract scale: nanoERG per 0.001 USE) and `stablecoin_decimals` is `3`
- **THEN** `raw_oracle_rate` SHALL be `3,206,702`

#### Scenario: DexyGOLD (3 decimals, divisor 1,000,000) raw_oracle_rate
- **WHEN** internal `oracle_rate` is `1,234,567,890` (contract scale) and `stablecoin_decimals` is `3`
- **THEN** `raw_oracle_rate` SHALL be `1,234,567,890`

### Requirement: MintStatus includes stablecoin_decimals
The `MintStatus` response SHALL include a `stablecoin_decimals` field (i32) indicating the number of decimal places for the stablecoin token. This allows consumers to convert between raw and display units without hardcoding.

#### Scenario: USE stablecoin_decimals
- **WHEN** `get_mint_status` is called for a USE instance
- **THEN** `stablecoin_decimals` SHALL be `3`

#### Scenario: Zero-decimal stablecoin
- **WHEN** `get_mint_status` is called for a stablecoin with `0` decimals
- **THEN** `stablecoin_decimals` SHALL be `0`

### Requirement: oracle_rate in API response is display scale
The `MintBoxState.oracle_rate` field in the API response SHALL be at display scale (nanoERG per whole stablecoin unit). Internally, `MintBoxState.oracle_rate` is stored at contract scale; the conversion to display scale SHALL happen at the serialization boundary: `oracle_rate_display = oracle_rate_contract * 10^stablecoin_decimals`.

#### Scenario: USE oracle_rate in API response
- **WHEN** internal `oracle_rate` is `3,206,702` (contract scale) and `stablecoin_decimals` is `3`
- **THEN** the serialized `oracle_rate` in the API response SHALL be `3,206,702,000` (display scale)

#### Scenario: Zero-decimal stablecoin oracle_rate in API response
- **WHEN** internal `oracle_rate` is `500,000` and `stablecoin_decimals` is `0`
- **THEN** the serialized `oracle_rate` SHALL be `500,000` (no scaling, contract = display)

### Requirement: MintBoxState.oracle_rate documentation reflects internal contract scale
The `MintBoxState` Rust struct field `oracle_rate` SHALL document that it stores the oracle rate at contract scale (nanoERG per raw stablecoin unit), not display scale. The doc comment SHALL be updated from "Oracle price (nanoERG per stablecoin unit)" to "Oracle price at contract scale (nanoERG per raw stablecoin unit). Serialized at display scale (multiplied by 10^stablecoin_decimals)."

#### Scenario: Doc comment updated
- **WHEN** a developer reads the `MintBoxState.oracle_rate` field documentation
- **THEN** it SHALL clearly state the value is at contract scale internally and serialized at display scale

### Requirement: Frontend calculates mint amounts using oracle_rate at display scale
`MintWidget.tsx` SHALL use `oracle_rate` (display scale) from the API response for all local ERG/mint calculations, removing the manual `* 10^stablecoinDecimals` scaling. The formula becomes: `mint_amount = (erg_amount * fee_denom) / (oracle_rate * total_multiplier)`.

#### Scenario: Frontend mint output calculation
- **WHEN** a user enters an ERG amount and the API returns `oracle_rate = 3,206,702,000` (display scale) for USE
- **THEN** `calculateMintOutputWithFees` SHALL compute `mint_amount = (erg_nano * fee_denom) / (oracle_rate * total_multiplier)` without any decimals multiplier

#### Scenario: Frontend ERG input calculation
- **WHEN** a user enters a mint amount and the API returns `oracle_rate = 3,206,702,000` for USE
- **THEN** `calculateErgInputForMint` SHALL compute `erg_amount = (desired_mint * oracle_rate * total_multiplier) / fee_denom` divided by `10^decimals` only for raw-to-display token amount conversion

### Requirement: oracle_rate_divisor extraction fails loudly
The `extract_arbmint_params` and `extract_freemint_params` functions in `crux-boxes` SHALL return `None` if `oracle_rate_divisor` cannot be extracted from the ErgoTree constants, instead of silently defaulting to `1` via `unwrap_or(1)`. The `unwrap_or(1)` SHALL be removed and replaced by early `?` propagation.

#### Scenario: Extraction succeeds
- **WHEN** `extract_arbmint_params` parses a valid ErgoTree with oracle_rate_divisor at the expected constant index
- **THEN** the function SHALL return `Some(ArbmintParams { oracle_rate_divisor: 1000, ... })`

#### Scenario: Extraction fails
- **WHEN** `extract_i64_from_constant` returns `None` for the oracle_rate_divisor index
- **THEN** the function SHALL return `None` rather than defaulting to `oracle_rate_divisor: 1`

#### Scenario: Upstream handler for extraction failure
- **WHEN** `fetch_mint_box_state` receives `None` from extraction
- **THEN** it SHALL return an error (`MintConstraint::Error`) indicating that oracle_rate_divisor could not be extracted, rather than proceeding with a default