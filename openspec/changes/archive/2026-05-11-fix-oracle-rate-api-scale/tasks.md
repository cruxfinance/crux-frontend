## 1. crux-boxes: Fail loudly on oracle_rate_divisor extraction

- [x] 1.1 In `crux-boxes/src/dexy/parse.rs`, change `extract_arbmint_params` to propagate `extract_i64_from_constant` failure for `oracle_rate_divisor` instead of `unwrap_or(1)`. Remove the `unwrap_or(1)`, use `?` to return `None` on extraction failure.
- [x] 1.2 In `crux-boxes/src/dexy/parse.rs`, change `extract_freemint_params` the same way — remove `unwrap_or(1)` for `oracle_rate_divisor`, use `?` propagation.
- [x] 1.3 Run `cargo test` in crux-boxes to verify existing tests still pass with explicit divisor extraction.

## 2. ci-api: Handle oracle_rate_divisor extraction failure

- [x] 2.1 In `ci-api/src/utilities/dexy.rs` `fetch_mint_box_state`, handle `None` from `extract_arbmint_params` / `extract_freemint_params` by returning an `MintConstraint::Error` stating "Failed to extract oracle_rate_divisor from tracking box ErgoTree". Update both the arbmint and freemint branches.
- [x] 2.2 In `ci-api/src/utilities/dexy.rs` `build_mint_transaction`, handle `None` from extraction the same way. Return a clear error string rather than proceeding with a default divisor.

## 3. ci-api: Scale oracle_rate at API boundary, add raw_oracle_rate and stablecoin_decimals

- [x] 3.1 Add `raw_oracle_rate: i64` and `stablecoin_decimals: i32` fields to `MintStatus` struct in `ci-api/src/entities/dexy.rs`. Doc: `raw_oracle_rate` = contract scale (nanoERG per raw stablecoin unit), `stablecoin_decimals` = number of decimal places.
- [x] 3.2 Add custom `Serialize` impl for `MintBoxState` (or use a helper field) so that `oracle_rate` is serialized at display scale (`oracle_rate * 10^stablecoin_decimals`) while the internal Rust field stays at contract scale. Ensure `stablecoin_decimals` is available at serialization time (add it to `MintBoxState` or pass it through `MintStatus`).
- [x] 3.3 In `get_mint_status`, compute `raw_oracle_rate = box_state.oracle_rate` (contract scale) and set `stablecoin_decimals` on the response.
- [x] 3.4 Update `MintBoxState.oracle_rate` doc comment to "Oracle price at contract scale (nanoERG per raw stablecoin unit). Serialized at display scale (multiplied by 10^stablecoin_decimals)."
- [x] 3.5 Fix the stale comment at line 555-556 in `fetch_mint_box_state` that claims "Both oracle_rate and lp_rate are in per whole unit format" — oracle_rate is contract scale internally, only lp_rate is display-scale.

## 4. ci-api: Update test to match new conventions

- [x] 4.1 In `tests/mock_mint_status_end_to_end.rs`, update `test_before_peak_unavailable` (line 223) to store oracle_rate at contract scale (`raw / divisor` without `* 1000`), matching the `reconstruct_pipeline` function.
- [x] 4.2 Add assertions in tests verifying: `raw_oracle_rate` = contract scale, serialized `oracle_rate` = display scale (`raw_oracle_rate * 1000` for USE).

## 5. crux-frontend (feature branch): Use oracle_rate at display scale

- [x] 5.1 Add `raw_oracle_rate: number` and `stablecoin_decimals: number` to the MintStatus type definition in the frontend.
- [x] 5.2 In `MintWidget.tsx`, update comments in `calculateMintOutputWithFees` and `calculateErgInputForMint` to clarify that oracle_rate is display-scale and the `* 10^decimals` scaling is the correct conversion for raw-unit output. (Formula math remains the same — it was already correct for display-scale oracle_rate.)
- [x] 5.3 Update the MintWidget test mock data to include `raw_oracle_rate` and `stablecoin_decimals`, and update the `dexyApi.ts` error fallback to include the new fields.

## 6. crux-fulfiller: Verify contract-scale oracle_rate usage

- [x] 6.1 Audit `crux-fulfiller` oracle_rate usage in `src/sources/dexy_mint.rs`, `src/executor/tx_builder/dexy_mint.rs`, and `src/arbitrage/detector.rs` to confirm all calculations use contract-scale oracle_rate consistently. Document findings.
- [x] 6.2 No functional fix needed — all runtime code correctly uses contract-scale oracle_rate. Only minor comment inconsistencies found (comments say "per stablecoin" when they mean "per smallest unit").

## 7. Verification

- [x] 7.1 Run `cargo test` across ci-api and crux-boxes. All tests pass.
- [ ] 7.2 Run `npm run build` (or `next build`) in crux-frontend. No TypeScript errors. (Build passes, type error in dexyApi.ts fixed.)
- [ ] 7.3 Manually verify the `/dexy/mint-status` API response: `oracle_rate` at display scale (for USE: ~3,206,702,000), `raw_oracle_rate` at contract scale (~3,206,702), `stablecoin_decimals` = 3. (User verified — production and local responses match.)