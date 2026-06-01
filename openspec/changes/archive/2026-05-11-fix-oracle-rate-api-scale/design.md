## Context

The Dexy mint oracle rate has two scales:

- **Contract scale**: nanoERG per raw stablecoin unit (e.g., nanoERG per 0.001 USE). This is what the on-chain ErgoScript contract uses. `oracle_rate = raw_oracle_price / oracle_rate_divisor`.
- **Display scale**: nanoERG per whole stablecoin unit (e.g., nanoERG per 1 USE). This is `oracle_rate * 10^decimals`.

The arbmint-oracle-scaling refactor (commit `8ff7759`) correctly moved all internal calculations to contract scale. The math works — `calculate_erg_for_mint`, `calculate_mint_from_erg`, max mint formulas, and `build_mint_transaction` all operate on consistent units. The `crux-boxes` test suite with real on-chain data passes.

The problem: the API response sends `oracle_rate` at contract scale, but the frontend expects display scale. The `MintWidget.tsx` line 457 explicitly comments "frontend oracle_rate is per whole unit" and multiplies by `10^decimals`. Receiving a contract-scale value makes frontend ERG/mint calculations off by 1000× for USE.

The pre-refactor API sent display scale because the `/divisor * decimal_multiplier` canceled out (divisor=1000, multiplier=1000). The refactor removed `* decimal_multiplier` but didn't adjust the API boundary.

**Deployment constraint**: The frontend feature branch is long-lived. The backend must be deployable independently without breaking the live frontend on main. This means `oracle_rate` in the API response must be restored to display scale (what production currently sends) so the live frontend keeps working.

## Goals / Non-Goals

**Goals:**
- Restore correct frontend mint calculations (ERG required, mint amounts)
- Maintain all internal math at contract scale (no changes to calculation functions)
- Make the API response unambiguous about scale
- Backend deployable independently — live frontend must not break
- Eliminate the `unwrap_or(1)` silent failure for oracle_rate_divisor extraction

**Non-Goals:**
- Changing how crux-boxes stores or computes anything
- Changing the on-chain contract or oracle format
- Refactoring the entire MintBoxState struct
- Migrating the live frontend to new fields (that happens on the feature branch)

## Decisions

### Decision 1: Scale `oracle_rate` at the serialization boundary, keep internal contract scale

**Choice**: Keep `MintBoxState.oracle_rate` at contract scale internally. At the API serialization boundary, scale it to display scale: `oracle_rate * 10^decimals`. This restores the pre-refactor API contract so the live frontend continues working.

**Rationale**: The internal math is correct and consistent. The bug is purely at the API boundary. Scaling at serialization is the minimal change — no calculation functions are touched, and the live frontend is unaffected.

**Alternative considered**: Change `oracle_rate` back to display scale in `MintBoxState` struct itself. Rejected because it would require re-introducing `* decimal_multiplier` in `fetch_mint_box_state`, re-introducing the scale mismatch with `lp_stablecoin_reserves` in the max mint formula, and adding `decimal_multiplier` parameters to all downstream functions. This was the old approach and it caused the original scaling bugs.

### Decision 2: Add `raw_oracle_rate` to MintStatus for contract-scale visibility

**Choice**: Add `raw_oracle_rate: i64` to `MintStatus` exposing the contract-scale value (nanoERG per raw unit). `oracle_rate` keeps its existing display-scale meaning — no renaming needed.

**Rationale**: "Raw" is unambiguous — it's the smallest on-chain unit. This is simpler than `display_oracle_rate` because `oracle_rate` already means display scale to every consumer. No one needs to migrate or change which field they read. The feature branch frontend just removes its `10^decimals` workaround and uses `oracle_rate` as-is. If a consumer needs contract scale, `raw_oracle_rate` is explicit.

### Decision 3: Add `stablecoin_decimals` to MintStatus

**Choice**: Include `stablecoin_decimals: i32` in `MintStatus` so the frontend knows the scaling factor without hardcoding.

**Rationale**: The frontend currently hardcodes decimals per token. Making it explicit in the API response removes ambiguity and makes adding new stablecoin types (Gold, etc.) straightforward.

### Decision 4: Feature branch frontend uses `oracle_rate` directly (display scale)

**Choice**: On the feature branch, `MintWidget` uses `oracle_rate` at display scale. Remove the manual `* 10^decimals` scaling in `calculateMintOutputWithFees` and `calculateErgInputForMint`.

**Rationale**: With `oracle_rate` at nanoERG per whole unit (restored by Decision 1), the frontend math becomes: `mint_amount = (erg_amount * fee_denom) / (oracle_rate * total_multiplier)` — no decimals scaling needed. The live frontend on main continues to work because `oracle_rate` in MintBoxState is back at display scale.

### Decision 5: Fail loudly on oracle_rate_divisor extraction failure

**Choice**: Change `unwrap_or(1)` to return `None` from the extraction functions in `crux-boxes`. Let upstream callers decide how to handle the failure rather than silently defaulting to 1.

**Rationale**: The `unwrap_or(1)` silently masks extraction failures. Production ran for weeks with divisor=1, making the oracle rate 1000× too large, compensated only by the `* decimal_multiplier` line. Silent failures are dangerous in financial code.

## Deployment Order

1. Deploy crux-boxes change (fail-loudly on divisor extraction)
2. Deploy ci-api changes (oracle_rate scaled at serialization boundary, new fields)
3. Live frontend (main) continues working — no changes needed on main
4. Feature branch frontend migrates to `display_oracle_rate` when it lands

No coordination needed between backend and frontend deployments. Backend is backwards-compatible.

## Risks / Trade-offs

- **[oracle_rate semantic ambiguity]** → Mitigated by: `oracle_rate` is restored to display scale in the API (what production always shipped). The new `raw_oracle_rate` field is the explicit contract-scale value. Clear doc comments on both. The `stablecoin_decimals` field removes any remaining ambiguity.

- **[crux-fulfiller divergence]** → crux-fulfiller already uses contract-scale `oracle_rate` internally and doesn't consume the API. No changes expected but verify.

- **[Test data inconsistency]** → `mock_mint_status_end_to_end.rs` line 223 stores oracle_rate at display scale (old convention). Align with the new contract-scale internal / display-scale API boundary convention.