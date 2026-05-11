## Why

The `arbmint-oracle-scaling` refactor (commit `8ff7759`) correctly moved `oracle_rate` to contract scale (nanoERG per raw unit) for internal calculations, but broke the API contract with the frontend. The frontend's `MintWidget` expects `oracle_rate` at display scale (nanoERG per whole unit) and scales by `10^decimals` in its local calculations. The API now sends a value 1000× too small for USE, causing incorrect ERG/mint calculations visible to users.

## What Changes

- `MintBoxState.oracle_rate` in the API response will return display-scale values (nanoERG per whole unit), restoring the pre-refactor API contract. This is NOT a breaking change — it's a bug fix restoring what production already shipped.
- Internal `MintBoxState.oracle_rate` stays at contract scale — no change to `calculate_erg_for_mint`, `calculate_mint_from_erg`, max mint formulas, or `build_mint_transaction`. The display-scale conversion happens at the serialization boundary.
- Add a `raw_oracle_rate` field to `MintStatus` response exposing the contract-scale value (nanoERG per raw unit). `oracle_rate` keeps its existing meaning: display scale (nanoERG per whole unit). "Raw" is unambiguous — it's the smallest on-chain unit.
- Add `stablecoin_decimals` to `MintStatus` so consumers know the scaling factor.
- Fix outdated comments in `fetch_mint_box_state` that claim both `oracle_rate` and `lp_rate` are "per whole unit".
- Update `crux-fulfiller` to use contract-scale `oracle_rate` consistently (it already does, but verify no display-scale assumptions).
- Frontend `MintWidget` on the feature branch will use `oracle_rate` directly (removing the manual `10^decimals` scaling workaround). Live frontend is unaffected since `oracle_rate` is restored to display scale.

## Capabilities

### New Capabilities
- `oracle-api-scale`: Defines the scale boundary between internal contract-scale math and display-scale API values. Adds `raw_oracle_rate` and `stablecoin_decimals` to MintStatus. `oracle_rate` remains at display scale (nanoERG per whole unit) in the API response.

### Modified Capabilities
- `arbmint-oracle-scaling`: Add requirement that the API boundary must present `oracle_rate` at display scale (restoring pre-refactor contract), while internal calculations continue using contract scale.

## Impact

- **ci-api**: `MintBoxState` serialization (oracle_rate scaled to display at API boundary), `MintStatus` response (new fields), `fetch_mint_box_state` comments, `get_mint_status` call site
- **crux-boxes**: No changes needed (internal library, contract-scale throughout)
- **crux-fulfiller**: Verify `oracle_rate` usage is contract-scale throughout (likely already correct)
- **crux-frontend (live/main)**: No changes needed — `oracle_rate` restored to display scale
- **crux-frontend (feature branch)**: Use `oracle_rate` directly (display scale), remove `10^decimals` scaling workaround